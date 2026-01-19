/**
 * Projects Component
 * Manage projects and resource allocations
 * P3 Enterprise Design System
 */

import React, { useState } from 'react';
import {
    Briefcase,
    Plus,
    Search,
    Calendar,
    Users,
    MoreVertical,
    X
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const Projects = () => {
    const { projects, addProject, updateProject, deleteProject } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="badge badge-active">Active</span>;
            case 'completed':
                return <span className="badge badge-inactive">Completed</span>;
            case 'planned':
                return <span className="badge badge-analysis">Planned</span>;
            default:
                return <span className="badge badge-inactive">{status}</span>;
        }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
                            Projects
                        </h1>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                            {projects.length}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Manage projects and resource allocations
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-9"
                        />
                    </div>
                    <div className="sm:w-40">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map(project => (
                        <div
                            key={project.id}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:shadow-enterprise-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-analysis/10 rounded-lg">
                                    <Briefcase className="w-5 h-5 text-analysis" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(project.status)}
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-sm font-semibold text-p3-midnight dark:text-white mb-1">
                                {project.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                {project.client ? `Client: ${project.client}` : 'Internal Project'}
                            </p>

                            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-3.5 h-3.5 mr-2" />
                                    <span>
                                        {new Date(project.startDate).toLocaleDateString()}
                                        {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                                    </span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Users className="w-3.5 h-3.5 mr-2" />
                                    <span>View Resources</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full">
                        <div className="empty-state">
                            <Briefcase className="empty-state-icon" />
                            <p className="empty-state-title">No projects found</p>
                            <p className="empty-state-description">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your filters.'
                                    : 'Create a new project to get started.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="modal max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2 className="modal-title">New Project</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-4">
                                <div>
                                    <label className="label">
                                        Project Name <span className="text-warning">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Q4 Marketing Campaign"
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        Client <span className="label-optional">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.client}
                                        onChange={e => setFormData({ ...formData, client: e.target.value })}
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            Start Date <span className="text-warning">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            className="input"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">End Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        className="select"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="planned">Planned</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Description</label>
                                    <textarea
                                        className="input min-h-[80px] resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Project goals and details..."
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
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
