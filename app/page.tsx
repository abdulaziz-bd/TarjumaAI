import { ToastContainer } from "react-toastify";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Translator from "./components/translator/Translator";

export default function Home() {

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-grow">
        <Translator />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
