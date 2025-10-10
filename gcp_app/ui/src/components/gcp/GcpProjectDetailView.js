import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import {
  ArrowLeft,
  Briefcase,
  Code,
  Users,
  User,
  Hash
} from 'lucide-react';
import Skeleton from '../shared/Skeleton';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

// ✅ Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API_BASE_URL = process.env.REACT_APP_API_URL;

const GcpProjectDetailView = () => {
  const { projectId } = useParams();
  const { token, selectedYear, theme } = useContext(GlobalStateContext);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Fetch project details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!token || !projectId) return;
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/project/${projectId}?year=${selectedYear}`,
          { headers: { 'x-access-token': token } }
        );
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        } else {
          console.error("API error:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch project details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [projectId, token, selectedYear]);

  // ✅ Chart color scheme based on theme
  const isDark = theme === 'dark';

  const chartData = {
    labels: Object.keys(project?.costHistory || {}).map(m => m.toUpperCase()),
    datasets: [
      {
        label: `Monthly Cost for ${selectedYear}`,
        data: Object.values(project?.costHistory || {}),
        backgroundColor: isDark
          ? 'rgba(96, 165, 250, 0.8)' // lighter blue for dark mode
          : 'rgba(59, 130, 246, 0.6)',
        borderWidth: 0,
        borderRadius: 6
      }
    ]
  };

  // ✅ Chart style options
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDarkMode = theme === 'dark' || (theme === 'system' && prefersDark);

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: isDarkMode ? '#E5E7EB' : '#1F2937',
      },
    },
    tooltip: {
      titleColor: isDarkMode ? '#F9FAFB' : '#1F2937',
      bodyColor: isDarkMode ? '#F9FAFB' : '#1F2937',
      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      titleFont: { weight: 'bold' },
      bodyFont: { weight: '500' },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: isDarkMode ? '#E5E7EB' : '#1F2937',
        font: { size: 12, weight: '600' },
      },
      border: { display: false },
    },
    y: {
      grid: { display: false },
      ticks: {
        color: isDarkMode ? '#E5E7EB' : '#1F2937',
        font: { size: 12, weight: '600' },
      },
      border: { display: false },
    },
  },
};

  // ✅ Loading skeleton
  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // ✅ No project found
  if (!project) {
    return (
      <div className="text-gray-600 dark:text-gray-300">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Back link */}
      <Link
        to="/projects"
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold"
      >
        <ArrowLeft size={16} /> Back to Projects List
      </Link>

      {/* Project name */}
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        {project.projectName}
      </h1>

      {/* Info section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Details */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 pb-2">
            Details
          </h2>

          <div className="flex items-center gap-3">
            <Code size={18} className="text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Project Code</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {project.projectCode || 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Hash size={18} className="text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Environment</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {project.environment || 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User size={18} className="text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Owner</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {project.owner || 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Briefcase size={18} className="text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Team</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {project.team || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Cost History ({selectedYear})
          </h2>
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Assigned Users */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Assigned Users
        </h2>

        {project.assignedUsers?.length > 0 ? (
          <ul className="space-y-2">
            {project.assignedUsers.map(user => (
              <li
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-700 transition-colors"
              >
                <Users size={16} className="text-gray-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {user.username}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No users are assigned to this project.
          </p>
        )}
      </div>
    </div>
  );
};

export default GcpProjectDetailView;
