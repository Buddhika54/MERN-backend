import Machine from "../models/Machine.js";
import Technician from "../models/Technician.js";
import Maintenance from "../models/Maintenance.js";

// Dashboard Summary Controller
export const getDashboardSummary = async (req, res) => {
  try {
    // Total machines
    const totalMachines = await Machine.countDocuments();

    // Total technicians
    const totalTechnicians = await Technician.countDocuments();

    // Maintenance counts by status
    const scheduled = await Maintenance.countDocuments({ status: "Scheduled" });
    const completed = await Maintenance.countDocuments({ status: "Completed" });
    const pending = await Maintenance.countDocuments({ status: "Pending" });
    const overdue = await Maintenance.countDocuments({ status: "Overdue" });

    // Calculate monthly maintenance cost
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const monthlyCostResult = await Maintenance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" }
        }
      }
    ]);

    const monthlyCost = monthlyCostResult.length > 0 ? monthlyCostResult[0].totalCost : 0;

    // Final response
    res.status(200).json({
      totalMachines,
      totalTechnicians,
      monthlyCost,
      maintenanceStats: {
        scheduled,
        completed,
        pending,
        overdue
      }
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
};
