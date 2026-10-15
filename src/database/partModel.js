const mongoose = require('mongoose');

const partSchema = new mongoose.Schema(
  {
    mfgPartNumber: {
      type: String,
      required: true,
      index: true,
    },
    footprint: {
      type: String,
    },
    description: {
      type: String,
    },
    quantity: {
      type: Number,
    },
    stockHistory: [
      {
        date: {
          type: Date,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        remarks: {
          type: String,
        },
        type: {
          type: Number,
          enum: [1, -1], // 1 = Add, -1 = Remove
          required: true,
        },
      },
    ],
    value: {
      type: String,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('part', partSchema, 'parts');
