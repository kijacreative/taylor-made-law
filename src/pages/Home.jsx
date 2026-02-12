import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Shield, 
  Scale, 
  CheckCircle2,
  Zap
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: 'Verified Attorneys',
      description: 'Every attorney in our network is thoroughly vetted and verified for quality representation.'
    },
    {
      icon: Zap,
      title: 'Fast Matching',
      description: 'Get matched with qualified attorneys in your area within hours, not days.'
    },
    {
      icon: Scale,
      title: 'Transparent Process',
      description: 'Clear communication and updates throughout your legal journey.'
    }
  ];

  const practiceAreas = [
    'Personal Injury',
    'Auto Accidents',
    'Medical Malpractice',
    'Workers Compensation',
    'Mass Torts',
    'Wrongful Death'
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      
      {/* Hero Section */}
      <section className="relative pt-20 min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, rgba(126, 39, 126, 0.85) 0%, rgba(153, 51, 51, 0.85) 100%)'
          }}
        />
        
        {/* Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <motion.div {...fadeIn}>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Get{' '}
                <span className="relative inline-block">
                  Fitted
                  <svg className="absolute -bottom-2 left-0 w-full h-4" viewBox="0 0 200 20" preserveAspectRatio="none">
                    <path 
                      d="M0,15 Q50,5 100,15 T200,15" 
                      fill="none" 
                      stroke="#a47864" 
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="text-[#a47864]">.</span>
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">
                Your Digital Tailor for a Better Legal Fit.
              </h2>
              <p className="text-lg text-white/80 mb-10 leading-relaxed max-w-2xl">
                You're not just another name in a directory—you deserve a legal professional with unique expertise 
                tailored to your specific needs. We help you match with the right attorney for your case.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to={createPageUrl('FindLawyer')}>
                <TMLButton variant="accent" size="lg" className="group">
                  Find a Lawyer
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </TMLButton>
              </Link>
              <Link to={createPageUrl('ForLawyers')}>
                <TMLButton variant="secondary" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Join Our Network
                </TMLButton>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#faf8f5] to-transparent z-10" />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Taylor Made Law?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We connect you with qualified attorneys who are the perfect fit for your legal needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <TMLCard variant="elevated" hover className="h-full text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </TMLCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice Areas Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Practice Areas We Cover
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Our network includes experienced attorneys across multiple practice areas, 
                ready to help with your specific legal needs.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {practiceAreas.map((area) => (
                  <div key={area} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#3a164d]" />
                    <span className="text-gray-700 font-medium">{area}</span>
                  </div>
                ))}
              </div>

              <Link to={createPageUrl('FindLawyer')}>
                <TMLButton variant="primary">
                  Get Started Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </TMLButton>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#3a164d]/10 to-[#993333]/10 rounded-3xl" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center">
                    <Scale className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Free Case Evaluation</h3>
                  <p className="text-gray-600 mt-2">Get matched with the right attorney</p>
                </div>
                
                <div className="space-y-4">
                  {['Quick 5-minute form', 'No cost or obligation', 'Matched within 24 hours'].map((item) => (
                    <div key={item} className="flex items-center gap-3 bg-[#faf8f5] rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-[#3a164d]" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                <Link to={createPageUrl('FindLawyer')} className="block mt-8">
                  <TMLButton variant="primary" className="w-full">
                    Start Your Free Evaluation
                  </TMLButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Attorneys CTA */}
      <section className="py-24 bg-gradient-to-br from-[#3a164d] to-[#993333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Are You an Attorney?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join our network of qualified attorneys and receive pre-screened, quality cases 
            matched to your practice areas and jurisdiction.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('ForLawyers')}>
              <TMLButton variant="accent" size="lg">
                Join Our Network
                <ArrowRight className="ml-2 w-5 h-5" />
              </TMLButton>
            </Link>
            <Link to={createPageUrl('Login')}>
              <TMLButton 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Attorney Login
              </TMLButton>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Network Attorneys' },
              { value: '50', label: 'States Covered' },
              { value: '10k+', label: 'Cases Referred' },
              { value: '95%', label: 'Satisfaction Rate' }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}