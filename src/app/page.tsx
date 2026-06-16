import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import type { NextPage } from "next";
import Link from "next/link";

const Home: NextPage = () => {
  const benefits = [
    {
      title: "Antifraude",
      desc: "Mecanismos avanzados que limitan de forma efectiva comportamientos no autorizados.",
    },
    {
      title: "Flexible",
      desc: "Diseñado para adaptarse a múltiples tipos de actividades y formatos de evaluación.",
    },
    {
      title: "Analizable",
      desc: "Métricas profundas y analíticas detalladas para evaluar resultados con precisión.",
    },
  ];

  return (
    <div className='min-h-screen flex flex-col justify-between antialiased selection:bg-indigo-100'>
      {/* Hero Section */}
      <div className='mx-auto max-w-4xl py-20 px-6 flex flex-col items-center justify-center flex-grow text-center'>
      
        <h1 className='text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl leading-none'>
          Evaluaciones académicas, <span className="text-indigo-600">redefinidas.</span>
        </h1>
        
        <p className='mt-6 max-w-xl text-lg text-slate-500 sm:text-xl leading-relaxed'>
          Garantizá la integridad, flexibilidad y el análisis en tiempo real de tus exámenes con EXAMIO.
        </p>

        <div className='mt-10'>
          <Link href='/login'>
            <Button className='bg-indigo-600 px-8 py-3.5 text-base text-white font-semibold shadow-sm hover:bg-indigo-700 hover:shadow transition-all duration-200 rounded-lg'>
              Comenzar ahora
            </Button>
          </Link>
        </div>

        {/* Benefits Grid */}
        <div className='mt-24 grid gap-6 sm:grid-cols-3 max-w-5xl w-full text-left'>
          {benefits.map((item) => (
            <div 
              key={item.title} 
              className='group rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300'
            >
              <div className="h-2 w-8 bg-indigo-600 rounded-full mb-4 group-hover:w-12 transition-all duration-300" />
              <h3 className='text-lg font-bold text-slate-800 tracking-tight'>
                {item.title}
              </h3>
              <p className='mt-2 text-sm text-slate-500 leading-relaxed'>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
      
      <Footer />
    </div>
  );
};

export default Home;