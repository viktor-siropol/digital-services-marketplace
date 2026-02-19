import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/Button/Button";
import Loader from "../../components/Loader";
import { useProfileMutation } from "../../redux/api/userApiSlice";
import { setCredentials } from "../../redux/features/auth/authSlice";
import { toast } from "react-toastify";

const Profile = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [email, setEmail] = useState(" ");
  const [username, setUserName] = useState(" ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const dispatch = useDispatch();

  const [updateProfile, { isLoading: loadingUpdateProfile }] =
    useProfileMutation();

  useEffect(() => {
    setUserName(userInfo.username);
    setEmail(userInfo.email);
  }, [userInfo.username, userInfo.email]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password != confirmPassword) {
      toast.error("Password do not match");
    } else {
      try {
        const res = await updateProfile({
          _id: userInfo._id,
          username,
          email,
          password,
        }).unwrap();
        dispatch(setCredentials({ ... res }));
        toast.success("Profile updated successfully");
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    }
  };

  return (
    <div>
      <section className="mt-6">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-semibold mb-4 text-center">
            Update Profile
          </h1>

          <form onSubmit={submitHandler} className="max-w-sm mx-auto mt-10">
            <div className="mb-4">
              <label className="block mb-2">Username</label>
              <input
                type="text"
                placeholder="Enter Username"
                className="border rounded-md w-full p-2"
                value={username}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2">email</label>
              <input
                type="email"
                placeholder="Enter email"
                className="border rounded-md w-full p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2">password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="border rounded-md w-full p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Confirm password</label>
              <input
                type="password"
                placeholder="Confirm password"
                className="border rounded-md w-full p-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="border rounded-md  cursor-pointer mt-3"
            >
              hello
            </button>
            {loadingUpdateProfile && <Loader />}
          </form>
        </div>
      </section>
    </div>
  );
};

export default Profile;
