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
    const totalPages = Math.ceil(totalParts / 20);
    const partsData = await part
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((pageNo - 1) * 20)
      .limit(20)
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
    const { value, footprint, description, quantity } = req.body;

    if (req.session?.user?.permissions?.write !== true) {
      return res.status(403).json({
        message: 'Forbidden: You do not have write permissions!',
      });
    }

    const updatedPart = await part.findByIdAndUpdate(
      id,
      {
        $set: {
          value,
          footprint,
          description,
          quantity,
          updatedAt: new Date(), // Manually update timestamp if needed
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedPart) {
      return res.status(404).json({
        message: 'Part not found',
      });
    }

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

module.exports = { uploadBulkParts, fetchPartsPage, fetchById, updateById, deleteById };
