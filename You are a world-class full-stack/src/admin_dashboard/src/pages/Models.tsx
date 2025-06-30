import { useEffect, useState } from 'react';
import { axiosInstance } from '../stores/authStore';
import { Model, CreateModelRequest, UpdateModelRequest } from '../types';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<CreateModelRequest>({
    name: '',
    provider: 'ollama',
    model_id: '',
    description: '',
    context_length: 4096,
    capabilities: [],
    parameters: {},
    is_active: true,
    is_default: false,
  });

  const providerOptions = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'huggingface', label: 'Hugging Face' },
  ];

  const capabilityOptions = [
    'code-completion',
    'chat',
    'code-generation',
    'code-explanation',
    'debugging',
    'refactoring',
  ];

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/models/models');
      setModels(response.data || []);
    } catch (error: any) {
      console.error('Error fetching models:', error);
      toast.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const syncWithOllama = async () => {
    try {
      setSyncing(true);
      await axiosInstance.get('/api/models/models/sync/ollama');
      await fetchModels();
      toast.success('Models synced with Ollama successfully');
    } catch (error: any) {
      console.error('Error syncing with Ollama:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to sync with Ollama';
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateModel = async () => {
    try {
      const response = await axiosInstance.post('/api/models/models', formData);
      setModels([...models, response.data]);
      setIsModalOpen(false);
      resetForm();
      toast.success('Model created successfully');
    } catch (error: any) {
      console.error('Error creating model:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create model';
      toast.error(errorMessage);
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;

    try {
      const updateData: UpdateModelRequest = {
        name: formData.name,
        description: formData.description,
        context_length: formData.context_length,
        capabilities: formData.capabilities,
        parameters: formData.parameters,
        is_active: formData.is_active,
        is_default: formData.is_default,
      };

      const response = await axiosInstance.put(`/api/models/models/${editingModel.id}`, updateData);
      setModels(models.map(model => model.id === editingModel.id ? response.data : model));
      setIsModalOpen(false);
      setEditingModel(null);
      resetForm();
      toast.success('Model updated successfully');
    } catch (error: any) {
      console.error('Error updating model:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update model';
      toast.error(errorMessage);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await axiosInstance.delete(`/api/models/models/${modelId}`);
      setModels(models.filter(model => model.id !== modelId));
      toast.success('Model deleted successfully');
    } catch (error: any) {
      console.error('Error deleting model:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete model';
      toast.error(errorMessage);
    }
  };

  const toggleModelStatus = async (modelId: string, isActive: boolean) => {
    try {
      const response = await axiosInstance.put(`/api/models/models/${modelId}`, {
        is_active: !isActive,
      });
      setModels(models.map(model => model.id === modelId ? response.data : model));
      toast.success(`Model ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Error toggling model status:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update model status';
      toast.error(errorMessage);
    }
  };

  const setAsDefault = async (modelId: string) => {
    try {
      const response = await axiosInstance.put(`/api/models/models/${modelId}`, {
        is_default: true,
      });
      // Update all models - only one should be default
      setModels(models.map(model => ({
        ...model,
        is_default: model.id === modelId
      })));
      toast.success('Default model updated successfully');
    } catch (error: any) {
      console.error('Error setting default model:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to set default model';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'ollama',
      model_id: '',
      description: '',
      context_length: 4096,
      capabilities: [],
      parameters: {},
      is_active: true,
      is_default: false,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingModel(null);
    setIsModalOpen(true);
  };

  const openEditModal = (model: Model) => {
    setFormData({
      name: model.name,
      provider: model.provider,
      model_id: model.model_id,
      description: model.description || '',
      context_length: model.context_length,
      capabilities: model.capabilities,
      parameters: model.parameters || {},
      is_active: model.is_active,
      is_default: model.is_default,
    });
    setEditingModel(model);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingModel) {
      handleUpdateModel();
    } else {
      handleCreateModel();
    }
  };

  const handleCapabilityChange = (capability: string) => {
    const updatedCapabilities = formData.capabilities.includes(capability)
      ? formData.capabilities.filter(c => c !== capability)
      : [...formData.capabilities, capability];
    
    setFormData({ ...formData, capabilities: updatedCapabilities });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Models</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage AI models and their configurations
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={syncWithOllama}
            disabled={syncing}
          >
            {syncing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Syncing...
              </div>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Sync Ollama
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Model
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Capabilities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Context Length
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {models.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                              <CpuChipIcon className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {model.name}
                              {model.is_default && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {model.model_id}
                            </div>
                            {model.description && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {model.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          {model.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {model.capabilities.map((capability) => (
                            <span
                              key={capability}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {capability}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleModelStatus(model.id, model.is_active)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            model.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}
                        >
                          {model.is_active ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {model.context_length.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!model.is_default && (
                          <button
                            onClick={() => setAsDefault(model.id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(model)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingModel ? 'Edit Model' : 'Create New Model'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Provider</label>
                    <select
                      className="input"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      disabled={!!editingModel}
                    >
                      {providerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Model ID</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.model_id}
                    onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                    required
                    disabled={!!editingModel}
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Context Length</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.context_length}
                    onChange={(e) => setFormData({ ...formData, context_length: parseInt(e.target.value) || 4096 })}
                    min={1024}
                    max={32768}
                    required
                  />
                </div>
                <div>
                  <label className="label">Capabilities</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {capabilityOptions.map((capability) => (
                      <div key={capability} className="flex items-center">
                        <input
                          type="checkbox"
                          id={capability}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={formData.capabilities.includes(capability)}
                          onChange={() => handleCapabilityChange(capability)}
                        />
                        <label htmlFor={capability} className="ml-2 block text-sm text-gray-900 dark:text-white">
                          {capability}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Active
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_default"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Default Model
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingModel ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
