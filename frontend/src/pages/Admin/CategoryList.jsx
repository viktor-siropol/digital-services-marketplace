import { useState } from "react";
import { useCreateCategoryMutation } from "../../redux/api/categoryApiSlice";
import { toast } from "react-toastify";

const CategoryList = () => {
  const [name, setName] = useState("");

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();

  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const result = await createCategory({ name }).unwrap();
      toast.success(`${result.name} created successfully`);
      setName("");
    } catch (error) {
      toast.error(error?.data?.message || "Creating category failed");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 text-black">
      <h1 className="text-2xl font-semibold mb-6">Categories</h1>

      <form onSubmit={handleCreateCategory} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border rounded-md p-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
};

export default CategoryList;
