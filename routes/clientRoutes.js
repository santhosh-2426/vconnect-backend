const express = require("express");
const router = express.Router();
const Client = require("../models/Client");

// Create client
router.post("/", async (req, res) => {
  try {
    const {
      name,
      company,
      companyName,
      phone,
      email,
      address,
      gstNumber,
      notes
    } = req.body;

    const client = new Client({
      name,
      companyName: companyName || company, // 🔥 Fix mapping here
      phone,
      email,
      address,
      gstNumber,
      notes
    });

    const savedClient = await client.save();
    res.status(201).json(savedClient);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all clients
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find();    
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a client
router.delete("/:id", async (req, res) => {
  try {
    const deletedClient = await Client.findByIdAndDelete(req.params.id);
    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;