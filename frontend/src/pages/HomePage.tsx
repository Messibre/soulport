import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

const featureCards = [
  {
    title: "AI Skill Verifier",
    text: "Wallet behavior is translated into skill badges with confidence scoring.",
    icon: Bot,
  },
  {
    title: "Reputation Staking",
    text: "Stake-backed credibility aligns incentives between freelancers and clients.",
    icon: ShieldCheck,
  },
  {
    title: "Web2 Import",
    text: "Bring verified LinkedIn, Coursera, and GitHub achievements into Web3.",
    icon: WalletCards,
  },
];

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <section className="rounded-3xl border border-base-300 bg-base-200/65 p-8 shadow-aurora sm:p-12">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase"
        >
          <Sparkles className="size-3.5" />
          Decentralized Professional Identity
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-5 text-balance text-4xl font-black leading-tight sm:text-5xl lg:text-6xl"
        >
          Own your reputation across every platform.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-5 max-w-2xl text-base opacity-80 sm:text-lg"
        >
          SoulPort turns your verified work history, skills, and attestations
          into portable onchain credentials powered by Base and EAS.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link to="/dashboard" className="btn btn-primary">
            Launch App
            <ArrowRight className="size-4" />
          </Link>
          <a href="#how-it-works" className="btn btn-outline">
            How It Works
          </a>
        </motion.div>
      </section>

      <section id="how-it-works" className="mt-14">
        <h2 className="text-2xl font-bold sm:text-3xl">How It Works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            "Connect Wallet",
            "Import & Verify",
            "Mint Reputation SBTs",
            "Get Matched",
          ].map((step, index) => (
            <div
              key={step}
              className="card bg-base-200/70 border border-base-300"
            >
              <div className="card-body">
                <p className="text-xs uppercase opacity-60">Step {index + 1}</p>
                <p className="font-semibold">{step}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="card border border-base-300 bg-base-200/70"
            >
              <div className="card-body">
                <Icon className="size-5 text-primary" />
                <h3 className="card-title">{feature.title}</h3>
                <p className="opacity-75">{feature.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-14 card border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="card-body">
          <p className="text-xs uppercase tracking-wider opacity-70">
            Testimonial
          </p>
          <p className="text-lg font-medium">
            "SoulPort gave me a profile I can carry anywhere. My clients now see
            verified proof, not just claims."
          </p>
          <p className="text-sm opacity-70">Demo user · Product Designer</p>
        </div>
      </section>
    </div>
  );
}
