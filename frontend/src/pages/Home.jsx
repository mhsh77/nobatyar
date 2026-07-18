import React, { useState, useEffect } from 'react';
import Navbar from '../components/home/Navbar';
import Hero from '../components/home/Hero';
import Stats from '../components/home/Stats';
import About from '../components/home/About';
import Services from '../components/home/Services';
import Steps from '../components/home/Steps';
import WorkingHours from '../components/home/WorkingHours';
import Contact from '../components/home/Contact';
import BlogSection from '../components/home/BlogSection';
import Chatbot from '../components/Chatbot';
import Footer from '../components/home/Footer';
import SEO from '../components/SEO';
import API from '../api/axios';

export default function Home() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    API.get('/settings').then(r => setSettings(r.data.settings || {})).catch(() => {});
  }, []);
  return (
    <main>
      <SEO
        title={`${settings.doctor_name || 'دکتر حسین مرادی'} | روانشناس بالینی`}
        description={settings.hero_description || 'نوبت‌دهی آنلاین دکتر حسین مرادی، روانشناس بالینی'}
        url="https://moradipsy.ir"
      />
      <Navbar />
      <Hero />
      <Stats />
      <About />
      <Services />
      <Steps />
      <WorkingHours />
      <BlogSection />
      <Contact />
      <Chatbot />
      <Footer />
    </main>
  );
}
