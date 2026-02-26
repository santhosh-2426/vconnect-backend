const express = require("express");
const router = express.Router();
const Project = require("../models/project");

const { protect } = require("../middleware/authMiddleware");

// 🔐 Protect all routes
router.use(protect);

// =============================
// CREATE PROJECT
// =============================
router.post("/", async (req, res) => {
  try {
   const project = new Project({
  ...req.body,
  totalPaid: 0,
  expenses: 0,
  balance: req.body.projectValue,
  profit: req.body.projectValue
});

const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// GET ALL PROJECTS
// =============================
router.get("/", async (req, res) => {
  try {
    let projects;

    projects = await Project.find().populate("client");

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// GET SINGLE PROJECT
// =============================
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client")
      .populate("assignedEditors", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// UPDATE PROJECT
// =============================
router.put("/:id", async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("client");

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// 🆕 UPDATE PROJECT STATUS
// =============================
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.status = status;
    await project.save();

    res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: project
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// DELETE PROJECT
// =============================
router.delete("/:id", async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============================
// ASSIGN EDITOR
// =============================
router.patch(
  "/:id/assign-editor",
  async (req, res) => {
    try {
      const { editorId } = req.body;

      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const alreadyAssigned = project.assignedEditors.some(
        (id) => id.toString() === editorId
      );

      if (!alreadyAssigned) {
        project.assignedEditors.push(editorId);
        await project.save();
      }

      res.status(200).json({
        success: true,
        message: "Editor assigned successfully",
        data: project,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// =============================
// UPDATE PROGRESS
// =============================
router.patch(
  "/:id/progress",
  async (req, res) => {
    try {
      const { progress } = req.body;

      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      project.progress = progress;
      await project.save();

      res.status(200).json({
        success: true,
        message: "Progress updated successfully",
        data: project,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ success: true, project });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});