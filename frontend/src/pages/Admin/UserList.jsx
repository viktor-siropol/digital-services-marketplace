import { useMemo, useState } from "react";
import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "../../redux/api/userApiSlice";
import Message from "../../components/Message";
import Loader from "../../components/Loader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { FaCheck, FaEdit, FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials } from "../../redux/features/auth/authSlice";

const formatShortId = (value = "") => {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const UserList = () => {
  const { data: users = [], isLoading, error } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [editableUserId, setEditableUserId] = useState(null);
  const [editableUserName, setEditableUserName] = useState("");
  const [editableUserEmail, setEditableUserEmail] = useState("");
  const [editableUserIsSeller, setEditableUserIsSeller] = useState(false);

  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sellerToggleId, setSellerToggleId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.isAdmin).length;
    const sellers = users.filter((user) => user.isSeller).length;
    const customers = users.filter(
      (user) => !user.isAdmin && !user.isSeller,
    ).length;

    return {
      total,
      admins,
      sellers,
      customers,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let items = [...users];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();

      items = items.filter((user) => {
        return (
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user._id?.toLowerCase().includes(query)
        );
      });
    }

    items.sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) {
        return a.isAdmin ? -1 : 1;
      }

      return a.username.localeCompare(b.username);
    });

    return items;
  }, [users, searchTerm]);

  const openEdit = (user) => {
    setEditableUserId(user._id);
    setEditableUserName(user.username || "");
    setEditableUserEmail(user.email || "");
    setEditableUserIsSeller(Boolean(user.isSeller));
  };

  const closeEdit = () => {
    setEditableUserId(null);
    setEditableUserName("");
    setEditableUserEmail("");
    setEditableUserIsSeller(false);
  };

  const updateHandler = async (id) => {
    const trimmedUserName = editableUserName.trim();
    const trimmedEmail = editableUserEmail.trim();

    if (!trimmedUserName) {
      toast.error("Username is required");
      return;
    }

    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      setSavingId(id);

      const updated = await updateUser({
        id,
        username: trimmedUserName,
        email: trimmedEmail,
        isSeller: editableUserIsSeller,
      }).unwrap();

      toast.success("User updated");
      closeEdit();

      if (String(userInfo?._id) === String(updated?._id)) {
        dispatch(setCredentials({ ...userInfo, ...updated }));
      }
    } catch (updateError) {
      toast.error(updateError?.data?.message || updateError?.error);
    } finally {
      setSavingId(null);
    }
  };

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setUserToDelete(null);
  };

  const confirmDeleteHandler = async () => {
    if (!userToDelete) return;

    try {
      setDeletingId(userToDelete._id);
      await deleteUser(userToDelete._id).unwrap();
      toast.success("User deleted successfully");

      if (editableUserId === userToDelete._id) {
        closeEdit();
      }

      setUserToDelete(null);
    } catch (deleteError) {
      toast.error(deleteError?.data?.message || deleteError?.error);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSeller = async (user) => {
    try {
      setSellerToggleId(user._id);

      const updated = await updateUser({
        id: user._id,
        isSeller: !user.isSeller,
      }).unwrap();

      toast.success(
        updated.isSeller ? "Seller access enabled" : "Seller access removed",
      );

      if (String(userInfo?._id) === String(updated?._id)) {
        dispatch(setCredentials({ ...userInfo, ...updated }));
      }

      if (editableUserId === user._id) {
        setEditableUserIsSeller(Boolean(updated.isSeller));
      }
    } catch (toggleError) {
      toast.error(toggleError?.data?.message || toggleError?.error);
    } finally {
      setSellerToggleId(null);
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
          {error?.data?.message ||
            error?.message ||
            error?.error ||
            "Failed to load users"}
        </Message>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Admin workspace
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Users
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review account roles, update profile details, and manage seller
            access from one place.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Total users
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Admins
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.admins}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Sellers
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.sellers}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Customers
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.customers}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search users
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username, email or ID"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="inline-flex h-10.5 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {filteredUsers.length} result
          {filteredUsers.length === 1 ? "" : "s"}
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No users match your search
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try another search term or reset the current filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const isEditing = editableUserId === user._id;
              const isSaving = savingId === user._id;
              const isDeleting = deletingId === user._id;
              const isTogglingSeller = sellerToggleId === user._id;

              return (
                <article
                  key={user._id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Username
                              </label>
                              <input
                                type="text"
                                value={editableUserName}
                                onChange={(e) =>
                                  setEditableUserName(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Email
                              </label>
                              <input
                                type="email"
                                value={editableUserEmail}
                                onChange={(e) =>
                                  setEditableUserEmail(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                              />
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={editableUserIsSeller}
                              onChange={(e) =>
                                setEditableUserIsSeller(e.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                            />
                            <span>Seller access</span>
                          </label>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-semibold text-slate-900">
                              {user.username}
                            </h2>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                user.isAdmin
                                  ? "border border-slate-200 bg-slate-900 text-white"
                                  : "border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {user.isAdmin
                                ? "Admin"
                                : user.isSeller
                                  ? "Seller"
                                  : "User"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            {user.email}
                          </p>

                          <p
                            className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400"
                            title={user._id}
                          >
                            ID: {formatShortId(user._id)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-start justify-start gap-2 xl:justify-end">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateHandler(user._id)}
                            disabled={isSaving}
                            className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaCheck className="text-xs" />
                            <span>{isSaving ? "Saving..." : "Save"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={closeEdit}
                            disabled={isSaving}
                            className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FaTimes className="text-xs" />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleSeller(user)}
                            disabled={isTogglingSeller}
                            className={`inline-flex min-w-31 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              user.isSeller
                                ? "border-slate-200 bg-slate-900 text-white hover:bg-slate-800"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {isTogglingSeller
                              ? "Updating..."
                              : user.isSeller
                                ? "Disable seller"
                                : "Enable seller"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <FaEdit className="text-xs" />
                            <span>Edit</span>
                          </button>

                          {!user.isAdmin && (
                            <button
                              type="button"
                              onClick={() => openDeleteDialog(user)}
                              disabled={isDeleting}
                              className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaTrash className="text-xs" />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Delete user?"
        description={
          userToDelete
            ? `This will permanently delete "${userToDelete.username}". This action cannot be undone.`
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

export default UserList;
