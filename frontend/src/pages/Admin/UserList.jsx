import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "../../redux/api/userApiSlice";
import Message from "../../components/Message";
import { useState } from "react";
import Loader from "../../components/Loader";
import { FaCheck, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials } from "../../redux/features/auth/authSlice";

const UserList = () => {
  console.log("Loader import =", Loader);
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const [editableUserId, setEditableUserId] = useState(null);
  const [editableUserName, setEditableUserName] = useState("");
  const [editableUserEmail, setEditableUserEmail] = useState("");
  const [editableUserIsSeller, setEditableUserIsSeller] = useState("");

  const { userInfo } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const toogleEdit = (id, username, email, isSeller) => {
    setEditableUserId(id);
    setEditableUserName(username);
    setEditableUserEmail(email);
    setEditableUserIsSeller(isSeller);
  };

  const updateHandler = async (id) => {
    try {
      const updated = await updateUser({
        id,
        username: editableUserName,
        email: editableUserEmail,
        isSeller: editableUserIsSeller,
      }).unwrap();

      setEditableUserId(null);
      toast.success("User updated");

      if (String(userInfo?._id) === String(updated?._id)) {
        dispatch(setCredentials({ ...userInfo, ...updated }));
      }
    } catch (error) {
      toast.error(error?.data?.message || error?.error);
    }
  };

  const deleteHandler = async (id) => {
    try {
      await deleteUser(id).unwrap();
      toast.success("User succsesfully deleted");
    } catch (error) {
      toast.error(error?.data?.message || error.error);
    }
  };

  const toggleSeller = async (id, isSeller) => {
    try {
      await updateUser({ id, isSeller: !isSeller }).unwrap();
      toast.success("Seller status updated");
    } catch (error) {
      toast.error(error?.data?.message || error?.error);
    }
  };

  return (
    <div className="p-4">
      <h1>Users</h1>
      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error?.data?.message ||
            error?.message ||
            error?.error ||
            "Unknown error"}
        </Message>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">USER</th>
                <th className="px-4 py-2 text-left">EMAIL</th>
                <th className="px-4 py-2 text-left">ADMIN</th>
                <th className="px-4 py-2 text-left">SELLER</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-2 text-black">{user._id}</td>
                  <td className="px-4 py-2 flex items-center">
                    {editableUserId === user._id ? (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editableUserName}
                          onChange={(e) => {
                            setEditableUserName(e.target.value);
                          }}
                          className="w-46 p-2 border rounded-lg"
                        />
                        <button onClick={() => updateHandler(user._id)}>
                          <FaCheck className="ml-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {user.username}{" "}
                        <button
                          onClick={() =>
                            toogleEdit(
                              user._id,
                              user.username,
                              user.email,
                              user.isSeller,
                            )
                          }
                        >
                          <FaEdit className="ml-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-black">
                    {editableUserId === user._id ? (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editableUserEmail}
                          onChange={(e) => {
                            setEditableUserEmail(e.target.value);
                          }}
                          className="w-46 p-2 border rounded-lg"
                        />
                        <button onClick={() => updateHandler(user._id)}>
                          <FaCheck className="ml-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {user.email}{" "}
                        <button
                          onClick={() =>
                            toogleEdit(
                              user._id,
                              user.username,
                              user.email,
                              user.isSeller,
                            )
                          }
                        >
                          <FaEdit className="ml-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-black">
                    {user.isAdmin ? (
                      <FaCheck className="text-green-500" />
                    ) : (
                      <FaTimes className="text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleSeller(user._id, user.isSeller)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                        user.isSeller ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full flex items-center justify-center transform transition-transform duration-300 ${
                          user.isSeller ? "translate-x-4" : "translate-x-0"
                        }`}
                      >
                        {user.isSeller ? (
                          <FaCheck className="text-green-600 text-[10px]" />
                        ) : (
                          <FaTimes className="text-red-600 text-[10px]" />
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    {!user.isAdmin && (
                      <button
                        onClick={() => deleteHandler(user._id)}
                        className="border px-4 p-2 rounded-md bg-red-600 text-white"
                      >
                        {" "}
                        <FaTrash />{" "}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;
