const part = require('../database/partModel');

async function uploadBulkParts(req, res) {
  const parts = req.body;
  const bulkOperations = [];
  try {
    //session checker middleware to be called before this function
    const role = req.session.role;
    if (role !== 'admin') {
      const permissions = req.session.user.permissions;
      if (permissions.write !== true) {
        return res.status(403).json({
          message: 'User forbidden to upload parts!',
        });
      }
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ message: 'Payload must be a non-empty array of parts.' });
    }

    if (parts.length > 2000) {
      return res.status(413).json({
        message: 'Payload exceeds maximum limit of 2,000 parts per batch.',
      });
    }

    const now = new Date();
    const seenMpns = new Set();

    for (const partObj of parts) {
      const cleanMpn = String(partObj.mfgPartNumber.replace(/["']g/, '') || '').trim();
      if (!cleanMpn) return;

      if (seenMpns.has(cleanMpn)) {
        continue;
      }
      seenMpns.add(cleanMpn);

      const cleanFootprint = String(partObj.footprint.replace(/["']g/, '') || '').trim();
      const cleanQty = Math.max(0, Number(partObj.quantity) || 0);
      const cleanDescription = String(partObj.description.replace(/["']g/, '') || '').trim();
      const cleanValue = String(partObj.value.replace(/["']g/, '') || '').trim();
      const cleanRemarks = String(partObj.remarks.replace(/["']g/, '') || '').trim();

      bulkOperations.push({
        updateOne: {
          filter: { mfgPartNumber: cleanMpn },
          update: {
            $setOnInsert: {
              mfgPartNumber: cleanMpn,
            },
            $inc: { quantity: cleanQty },
            $set: {
              remarks: cleanRemarks,
              description: cleanDescription,
              footprint: cleanFootprint,
              value: cleanValue,
            },
            $push: {
              stockHistory: {
                date: now,
                quantity: cleanQty,
                remarks: cleanRemarks || 'Stock updated through CSV bulk-Upload',
                type: 1,
              },
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOperations.length == 0) {
      return res.status(400).json({
        message: 'no parts with valid MPN found to be imported from CSV!',
      });
    }

    const bulkRes = await part.bulkWrite(bulkOperations, { ordered: false });
    return res.status(200).json({
      message: 'Parts imported from CSV successfully!',
      details: {
        inserted: bulkRes.upsertedCount,
        updated: bulkRes.modifiedCount,
      },
    });
  } catch (error) {
    // Scenario B: Partial or Complete Bulk Failure
    if (error.name === 'MongoBulkWriteError' || error.writeErrors) {
      // Extract details of every failed row
      const failureDetails = error.writeErrors.map((err) => {
        const failedPart = parts[err.index]; // Map back to original row using the index!

        return {
          rowNumber: err.index + 1, // Row number in spreadsheet (accounting for 1-based index)
          mfgPartNumber: failedPart?.mfgPartNumber || 'Unknown',
          reason: err.code === 11000 ? 'Duplicate key violation in database.' : err.errmsg,
        };
      });

      // Partial success counts can be pulled from error.result
      const successInserted = error.bulkRes?.nUpserted || 0;
      const successUpdated = error.bulkRes?.nModified || 0;

      console.log('failure details: ', failureDetails);

      return res.status(207).json({
        // HTTP 207 Multi-Status (Standard for partial batch success)
        success: false,
        message: 'Spreadsheet processed with partial errors.',
        summary: {
          totalSubmitted: parts.length,
          inserted: successInserted,
          updated: successUpdated,
          failedCount: failureDetails.length,
        },
        failures: failureDetails, // List sent to frontend so user knows what to fix
      });
    }

    // Scenario C: Generic unhandled server error
    console.log('Unhandled Bulk Upload Error:', error);
    return res.status(500).json({
      message: 'Server error processing file.',
      error: error.message,
    });
  }
}

async function fetchPartsPage(req, res) {
  const pageNo = Math.max(1, parseInt(req.query.page, 10) || 1);
  const searchTerm = req.query.search || '';
  try {
    const filter = searchTerm
      ? {
          $or: [
            { mfgPartNumber: { $regex: searchTerm, $options: 'i' } },
            { value: { $regex: searchTerm, $options: 'i' } },
          ],
        }
      : {};
    const totalParts = await part.countDocuments(filter);
    const totalPages = Math.ceil(totalParts / 50);
    const partsData = await part
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((pageNo - 1) * 50)
      .limit(50)
      .lean();

    return res.status(200).json({
      message: `part documents for page - ${pageNo} fetched successfully!`,
      parts: partsData || [],
      totalPages: totalPages,
      currentPage: pageNo,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: `Internal server error in fetching parts for page ${pageNo}`,
    });
  }
}

async function fetchById(req, res) {
  const id = req.params.id;

  const partDoc = await part.findById(id).lean();
  if (!partDoc) {
    return res.status(404).json({
      message: 'Part not found!',
    });
  }

  return res.status(200).json({
    message: 'Part found successfully!',
    partDetails: partDoc,
  });
}

async function updateById(req, res) {
  try {
    const id = req.params.id;
    const { value, footprint, description, quantity, remarks } = req.body;

    if (req.session?.user?.permissions?.write !== true) {
      return res.status(403).json({
        message: 'Forbidden: You do not have write permissions!',
      });
    }

    const existingPart = await part.findById(id);
    if (!existingPart) {
      return res.status(404).json({ message: 'Part not found' });
    }

    const oldQuantity = existingPart.quantity || 0;
    const newQuantity = Number(quantity);
    const quantityDifference = newQuantity - oldQuantity;

    // 2. Prepare the update query object
    const updateQuery = {
      $set: {
        value,
        footprint,
        description,
        quantity: newQuantity,
        updatedAt: new Date(),
      },
    };

    // 3. If the quantity actually changed, push an entry to stockHistory
    if (quantityDifference !== 0) {
      const historyEntry = {
        date: new Date(),
        quantity: Math.abs(quantityDifference), // Store the absolute value of the change
        type: quantityDifference > 0 ? 1 : -1, // 1 = Add, -1 = Remove
        remarks: remarks || 'Updated via dashboard form',
      };

      updateQuery.$push = { stockHistory: historyEntry };
    }

    // 4. Perform the update
    const updatedPart = await part.findByIdAndUpdate(id, updateQuery, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: 'Part updated successfully!',
      part: updatedPart,
    });
  } catch (error) {
    console.log('error in updating part details: ', error);
    return res.status(500).json({
      message: 'Internal Server error in updating part details!',
    });
  }
}

async function deleteById(req, res) {
  try {
    if (req.session?.user?.permissions?.write !== true) {
      return res.status(403).json({
        message: 'Forbidden: You do not have write permissions!',
      });
    }
    const id = req.params.id;
    const partExists = await part.findByIdAndDelete(id);

    if (!partExists) {
      return res.status(404).json({
        message: 'part not found!',
      });
    }

    return res.status(200).json({
      message: 'part deleted successfully!',
    });
  } catch (error) {
    console.log('Error in deleting part : ', error);
    return res.status(500).json({
      message: 'Internal server error in deleting part!',
    });
  }
}

async function adjustQuantity(req, res) {
  try {
    const id = req.params.id;
    const { delta } = req.body; // Expects a signed number
    if (req.session?.user?.permissions?.write !== true) {
      return res.status(403).json({
        message: 'Forbidden: You do not have write permissions!',
      });
    }

    const numericDelta = Number(delta);
    if (isNaN(numericDelta) || numericDelta === 0) {
      return res.status(400).json({
        message: 'Invalid or zero delta value provided.',
      });
    }

    const existingPart = await part.findById(id);
    if (!existingPart) {
      return res.status(404).json({
        message: 'Part not found',
      });
    }

    const currentQty = existingPart.quantity || 0;
    const newQuantity = currentQty + numericDelta;

    if (newQuantity < 0) {
      return res.status(400).json({
        message: 'Stock cannot be less than zero!',
      });
    }

    const historyEntry = {
      date: new Date(),
      quantity: Math.abs(numericDelta),
      type: numericDelta > 0 ? 1 : -1, // 1 = Add, -1 = Remove
      remarks: 'quantity update',
    };

    const updatedPart = await part.findByIdAndUpdate(
      id,
      {
        $inc: { quantity: numericDelta },
        $set: { updatedAt: new Date() },
        $push: { stockHistory: historyEntry },
      },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      message: 'Quantity adjusted successfully!',
      part: updatedPart,
    });
  } catch (error) {
    console.log('error in adjusting quantity: ', error);
    return res.status(500).json({
      message: 'Internal Server error in adjusting quantity!',
    });
  }
}

async function checkAvailabilityStatus(req, res) {
  try {
    const { items } = req.body; // Expects [{ mpn: 'PART-1001', qtyNeeded: 5 }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for availability check.' });
    }

    const mpns = items.map((i) => i.mpn);

    let dbParts = await part.find({ mfgPartNumber: { $in: mpns } }).lean();
    const partsMap = {};
    dbParts.forEach((p) => {
      partsMap[p.mfgPartNumber] = p;
    });

    const comparisonList = items.map((item) => {
      const matchedPart = partsMap[item.mpn];
      const availableQty = matchedPart ? matchedPart.quantity || 0 : 0;
      const requiredQty = item.qtyNeeded;
      const isNewlyAdded = !matchedPart; // or matched via auto-creation where qty was 0 and it wasn't in db prior

      let statusType = 'sufficient'; // green
      if (!matchedPart || (availableQty === 0 && requiredQty > 0)) {
        statusType = isNewlyAdded ? 'brand-new' : 'shortage'; // yellow or red
      } else if (availableQty < requiredQty) {
        statusType = 'shortage'; // red
      }

      return {
        mpn: item.mpn,
        footprint: matchedPart ? matchedPart.footprint || 'N/A' : 'N/A',
        value: matchedPart ? matchedPart.value || 'N/A' : 'N/A',
        description: matchedPart ? matchedPart.description || 'N/A' : 'N/A',
        availableQuantity: availableQty,
        quantityRequired: requiredQty,
        lastUpdated: matchedPart?.updatedAt
          ? new Date(matchedPart.updatedAt).toLocaleString()
          : 'Just now',
        statusType: statusType, // 'sufficient', 'shortage', or 'brand-new'
      };
    });

    return res.status(200).json({
      message: 'Project availability verified successfully!',
      comparisonList: comparisonList,
    });
  } catch (error) {
    console.error('Error in checkAvailabilityStatus:', error);
    return res.status(500).json({ message: 'Internal server error checking availability.' });
  }
}

async function updateProjectComponents(req, res) {
  try {
    const isAdmin = req.session?.role === 'admin';
    const hasWritePermission = Boolean(req.session?.user?.permissions?.write === true);

    if (!isAdmin && !hasWritePermission) {
      return res.status(403).json({
        message: 'Access denied. You do not have write permissions to update inventory.',
      });
    }
    const items = req.body; // Expects an array of mapped objects from the frontend

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for inventory update.' });
    }

    // Separate new components from existing components
    const newItems = items.filter((item) => item.isNew);
    const existingItems = items.filter((item) => !item.isNew);

    // --- 1. Handle Brand-New Parts Creation ---
    if (newItems.length > 0) {
      const newPartDocs = newItems.map((item) => {
        const initialQty = 0;
        return {
          mfgPartNumber: item.mpn,
          footprint: item.footprint || 'N/A',
          value: item.value || 'N/A',
          description: item.description || 'N/A',
          quantity: initialQty,
          remarks: item.remarks || 'part added through project',
          stockHistory: [
            {
              date: new Date(),
              quantity: initialQty,
              remarks: item.remarks || 'part added through project',
              type: 1, // 1 for addition/creation
            },
          ],
          updatedAt: new Date(),
        };
      });

      await part.insertMany(newPartDocs);
    }

    // --- 2. Handle Existing Parts Updates & Shortage Calculations ---
    for (const item of existingItems) {
      const targetPart = await part.findOne({ mfgPartNumber: item.mpn });
      if (!targetPart) continue;

      const currentQty = targetPart.quantity || 0;
      const requiredQty = item.quantityRequired || 0;

      let newQuantity = currentQty - requiredQty;
      let finalRemarks = item.remarks || 'used in project';

      // If shortage results in a negative value, clamp quantity to 0 and record shortage details in remarks
      if (newQuantity < 0) {
        finalRemarks = `Shortage: required ${requiredQty}, had ${currentQty}`;
        newQuantity = 0;
      }

      // Push a subtraction record into stockHistory (type: -1 for reduction)
      targetPart.stockHistory.push({
        date: new Date(),
        quantity: requiredQty,
        remarks: finalRemarks,
        type: -1, // -1 for subtraction/usage
      });

      targetPart.quantity = newQuantity;
      targetPart.remarks = finalRemarks;
      targetPart.updatedAt = new Date();

      await targetPart.save();
    }

    return res.status(200).json({
      message: 'Inventory updated successfully!',
    });
  } catch (error) {
    console.error('Error in updateProjectComponents:', error);
    return res.status(500).json({ message: 'Internal server error during inventory update.' });
  }
}

module.exports = {
  uploadBulkParts,
  fetchPartsPage,
  fetchById,
  updateById,
  deleteById,
  adjustQuantity,
  checkAvailabilityStatus,
  updateProjectComponents,
};
