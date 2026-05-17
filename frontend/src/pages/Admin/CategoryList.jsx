import { useMemo, useState } from "react";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "../../redux/api/categoryApiSlice";
import { toast } from "react-toastify";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import ConfirmDialog from "../../components/ConfirmDialog";
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const CategoryList = () => {
  const [name, setName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editableCategoryId, setEditableCategoryId] = useState(null);
  const [editableCategoryName, setEditableCategoryName] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const { data: categories = [], isLoading, error } = useGetCategoriesQuery();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const filteredCategories = useMemo(() => {
    let items = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();

      items = items.filter((category) =>
        category.name?.toLowerCase().includes(query),
      );
    }

    return items;
  }, [categories, searchTerm]);

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
    } catch (createError) {
      toast.error(createError?.data?.message || "Creating category failed");
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
      toast.success("Category updated");
      closeEdit();
    } catch (updateError) {
      toast.error(updateError?.data?.message || "Updating category failed");
    } finally {
      setSavingId(null);
    }
  };

  const openDeleteDialog = (category) => {
    setCategoryToDelete(category);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setCategoryToDelete(null);
  };

  const confirmDeleteHandler = async () => {
    if (!categoryToDelete) return;

    try {
      setDeletingId(categoryToDelete._id);
      await deleteCategory(categoryToDelete._id).unwrap();
      toast.success("Category deleted");

      if (editableCategoryId === categoryToDelete._id) {
        closeEdit();
      }

      setCategoryToDelete(null);
    } catch (deleteError) {
      toast.error(deleteError?.data?.message || "Deleting category failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Message variant="danger">
          {error?.data?.message || "Failed to load categories"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Admin workspace
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Categories
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create, rename, and organize categories used across the marketplace.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total categories
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {categories.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Visible results
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {filteredCategories.length}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Category management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a new category or update existing ones below.
            </p>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <form
              onSubmit={handleCreateCategory}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <label className="mb-2 block text-sm font-medium text-slate-700">
                New category
              </label>

              <input
                type="text"
                placeholder="Enter category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <button
                type="submit"
                disabled={creating}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create category"}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search categories
              </label>

              <input
                type="text"
                placeholder="Search by category name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset search
              </button>
            </div>
          </div>

          <div className="mt-5">
            {filteredCategories.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="font-medium text-slate-900">
                  No categories found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try another search term or create a new category.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredCategories.map((category) => {
                  const isEditing = editableCategoryId === category._id;
                  const isSaving = savingId === category._id;
                  const isDeleting = deletingId === category._id;

                  return (
                    <li
                      key={category._id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="min-w-0">
                          {isEditing ? (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={editableCategoryName}
                                onChange={(e) =>
                                  setEditableCategoryName(e.target.value)
                                }
                                autoFocus
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                              />

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateHandler(category._id)}
                                  disabled={isSaving}
                                  className="inline-flex min-w-22 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <FaCheck className="text-xs" />
                                  <span>{isSaving ? "Saving..." : "Save"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={closeEdit}
                                  disabled={isSaving}
                                  className="inline-flex min-w-22 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <FaTimes className="text-xs" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                              <span className="truncate text-base font-semibold text-slate-900">
                                {category.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(category._id, category.name)
                              }
                              className="inline-flex min-w-22 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <FaEdit className="text-xs" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteDialog(category)}
                              disabled={isDeleting}
                              className="inline-flex min-w-22 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaTrash className="text-xs" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Delete category?"
        description={
          categoryToDelete
            ? `This will permanently delete "${categoryToDelete.name}".`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteHandler}
        onCancel={closeDeleteDialog}
        loading={Boolean(deletingId)}
        variant="danger"
      />
    </div>
  );
};

export default CategoryList;
