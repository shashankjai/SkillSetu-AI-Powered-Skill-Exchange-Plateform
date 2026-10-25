import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";

const NotFoundPage = () => (
  <div className="flex min-h-dvh flex-col bg-[#FFFEFC] text-slate-900">
    <Navbar />
    <main className="dot-grid grid flex-1 place-items-center px-4 py-20 text-center">
      <div className="rise">
        <p className="font-display text-8xl font-semibold text-slate-700">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn-primary mt-8 text-sm">
          Back to home
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default NotFoundPage;
