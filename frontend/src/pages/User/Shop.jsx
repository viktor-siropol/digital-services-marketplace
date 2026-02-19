import React from "react";

const Shop = () => {
  return (
    <div>
      <section className="max-w-sm mx-auto">
        <div>
          <form className="">
            <div>
              <label htmlFor="email" className="block">
                email
              </label>
              <input className="border rounded-md" id="email" />
            </div>
            <div>
              <label htmlFor="password" className="block">
                password
              </label>
              <input className="border rounded-md" id="password" />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Shop;
