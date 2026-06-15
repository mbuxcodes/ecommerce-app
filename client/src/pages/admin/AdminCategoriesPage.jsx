import { useEffect, useState } from "react";
import Modal   from "../../components/ui/Modal.jsx";
import Button  from "../../components/ui/Button.jsx";
import Input   from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api     from "../../services/api.js";
import toast   from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ name: "", description: "", parent: "" });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/categories?includeInactive=true");
      setCategories(res.data.data.categories || []);
    } catch {
      toast.error("Failed to fetch categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", description: "", parent: "" });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({
      name:        cat.name,
      description: cat.description || "",
      parent:      cat.parent?._id || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.parent) delete payload.parent;

      if (editItem) {
        await api.put(`/categories/${editItem._id}`, payload);
        toast.success("Category updated!");
      } else {
        await api.post("/categories", payload);
        toast.success("Category created!");
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted!");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  };

  const parentCategories = categories.filter((c) => !c.parent);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Button onClick={openCreate}>
          <FiPlus size={16} />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Slug", "Parent", "Products", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">{cat.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cat.parent?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cat.productCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-400">No categories found</div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edit Category" : "Create Category"}
        showFooter
        onConfirm={handleSave}
        confirmText={editItem ? "Save Changes" : "Create"}
        loading={saving}
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Electronics"
            required
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Category description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Parent Category</label>
            <select
              value={form.parent}
              onChange={(e) => setForm((p) => ({ ...p, parent: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Top Level)</option>
              {parentCategories
                .filter((c) => c._id !== editItem?._id)
                .map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCategoriesPage;