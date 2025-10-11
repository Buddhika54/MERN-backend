const Machine = require("../Model/Machine");
const Technician = require("../Model/Technician");
const Maintenance = require("../Model/Maintenance");

// GET /Dash/summary
// Returns counts for dashboard widgets
const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();

    // Run counts in parallel for performance
    const [
      totalMachines,
      totalTechnicians,
      totalMaintenance,
      scheduledMaintenance,
      completedMaintenance,
      pendingMaintenance,
      overdueMaintenance,
    ] = await Promise.all([
      Machine.countDocuments({}),
      Technician.countDocuments({}),
      Maintenance.countDocuments({}),
      Maintenance.countDocuments({ status: /under-maintenance/i }),
      Maintenance.countDocuments({ status: /completed/i }),
      Maintenance.countDocuments({ status: /pending/i }),
      // Overdue: date before now and not completed
      Maintenance.countDocuments({
        date: { $lt: now },
        status: { $not: /completed/i },
      }),
    ]);

    return res.status(200).json({
      totalMachines,
      totalTechnicians,
      totalMaintenance,
      scheduledMaintenance,
      completedMaintenance,
      pendingMaintenance,
      overdueMaintenance,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res.status(500).json({ message: "Failed to load dashboard summary" });
  }
};

module.exports = { getDashboardSummary };

