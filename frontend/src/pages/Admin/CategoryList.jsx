import { useMemo, useState } from "react";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "../../redux/api/categoryApiSlice";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const CategoryList = () => {
  const [name, setName] = useState("");
  const [editableCategoryId, setEditableCategoryId] = useState(null);
  const [editableCategoryName, setEditableCategoryName] = useState("");

  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const { data: categories = [], isLoading, error } = useGetCategoriesQuery();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const openEdit = (id, currentName) => {
    setEditableCategoryId(id);
    setEditableCategoryName(currentName);
  };

  const closeEdit = () => {
    setEditableCategoryId(null);
    setEditableCategoryName("");
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Category name is required");
      return;
    }

    try {
      const result = await createCategory({ name: trimmed }).unwrap();
      toast.success(`"${result.name}" created`);
      setName("");
    } catch (err) {
      toast.error(err?.data?.message || "Creating category failed");
    }
  };

  const updateHandler = async (id) => {
    const trimmed = editableCategoryName.trim();
    if (!trimmed) {
      toast.error("Category name cannot be empty");
      return;
    }

    try {
      setSavingId(id);
      await updateCategory({ id, name: trimmed }).unwrap();
      toast.success("Updated");
      closeEdit();
    } catch (err) {
      toast.error(err?.data?.message || "Updating category failed");
    } finally {
      setSavingId(null);
    }
  };

  const deleteHandler = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    try {
      setDeletingId(id);
      await deleteCategory(id).unwrap();
      toast.success("Deleted");
      if (editableCategoryId === id) closeEdit();
    } catch (err) {
      toast.error(err?.data?.message || "Deleting category failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Categories
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Create bar */}
          <div className="p-5 border-b border-slate-200">
            <form
              onSubmit={handleCreateCategory}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1">
                <label className="sr-only" htmlFor="categoryName">
                  Category name
                </label>
                <input
                  id="categoryName"
                  type="text"
                  placeholder="Enter category name…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="rounded-xl px-5 py-3 font-medium text-white shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed
                           bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
          </div>

          {/* Body */}
          <div className="p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {error?.data?.message || "Failed to load categories"}
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-slate-700 font-medium">No categories yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Create your first category using the form above.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedCategories.map((c) => {
                  const isEditing = editableCategoryId === c._id;
                  const isRowSaving = savingId === c._id;
                  const isRowDeleting = deletingId === c._id;

                  return (
                    <li
                      key={c._id}
                      className="group rounded-xl border border-slate-200 bg-white px-4 py-3
                                 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      {/* Left: Name / Edit */}
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              updateHandler(c._id);
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={editableCategoryName}
                              onChange={(e) =>
                                setEditableCategoryName(e.target.value)
                              }
                              autoFocus
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900
                                         outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                            />

                            <button
                              type="submit"
                              disabled={isRowSaving}
                              aria-label="Save"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2
                                         hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <FaCheck className="text-slate-800" />
                            </button>

                            <button
                              type="button"
                              onClick={closeEdit}
                              aria-label="Cancel"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2
                                         hover:bg-slate-50 transition"
                            >
                              <FaTimes className="text-slate-700" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                            <span className="truncate font-medium text-slate-900">
                              {c.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => openEdit(c._id, c.name)}
                            aria-label="Edit"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2
                                       hover:bg-slate-50 transition"
                          >
                            <FaEdit className="text-slate-700" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteHandler(c._id)}
                          disabled={isRowDeleting}
                          aria-label="Delete"
                          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-white
                                     bg-rose-600 hover:bg-rose-700 transition
                                     disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
