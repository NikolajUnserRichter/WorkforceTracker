
import React, { useState } from 'react';
import {
    Briefcase,
    Plus,
    Search,
    Calendar,
    Users,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const Projects = () => {
    const { projects, addProject, updateProject, deleteProject } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        client: '',
        startDate: '',
        endDate: '',
        status: 'active',
        description: ''
    });

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.client?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.startDate) {
            toast.error('Please fill in required fields');
            return;
        }

        const success = await addProject(formData);
        if (success) {
            setIsModalOpen(false);
            setFormData({
                name: '',
                client: '',
                startDate: '',
                endDate: '',
                status: 'active',
                description: ''
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Projects
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage projects and resource allocations
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="planned">Planned</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map(project => (
                        <div
                            key={project.id}
                            className="card p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${project.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                        }`}>
                                        {project.status === 'active' ? 'Active' : project.status}
                                    </span>
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                {project.client ? `Client: ${project.client}` : 'Internal Project'}
                            </p>

                            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>
                                        {new Date(project.startDate).toLocaleDateString()}
                                        {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                                    </span>
                                </div>

                                {/* Placeholder for future resource allocation linkage */}
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Users className="w-4 h-4 mr-2" />
                                    <span>View Resources</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
                        <p>Create a new project to get started</p>
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all scale-100">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Project</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Q4 Marketing Campaign"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client (Optional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.client}
                                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="input-field"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                <select
                                    className="input-field"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="planned">Planned</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    className="input-field min-h-[100px]"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Project goals and details..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary px-6"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
