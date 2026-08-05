'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Help.module.css'

const faqs = [
  {
    question: "Quels sont les délais de livraison ?",
    answer: "Nos livreurs font de leur mieux pour vous apporter vos plats encore chauds. Le délai moyen est de 30 à 45 minutes selon votre zone et l'heure de la commande."
  },
  {
    question: "Puis-je modifier ma commande après paiement ?",
    answer: "Une fois le paiement validé, la commande est immédiatement transmise en cuisine. Il n'est malheureusement plus possible de la modifier via l'application. Veuillez nous contacter par téléphone au plus vite."
  },
  {
    question: "Que faire s'il manque un article ?",
    answer: "Si vous constatez un oubli, contactez-nous via WhatsApp ou par téléphone avec votre numéro de commande (ex: CMD-10294). Nous trouverons une solution immédiatement (remboursement ou relivraison)."
  },
  {
    question: "Acceptez-vous les paiements en espèces ?",
    answer: "Oui, vous pouvez choisir de payer en espèces à la livraison. Assurez-vous d'avoir l'appoint si possible pour faciliter le travail de nos livreurs."
  }
]

export default function HelpPage() {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState(0)

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div>
          <h1>Aide & Support</h1>
          <p className={styles.subtitle}>Nous sommes là pour vous aider</p>
        </div>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Questions Fréquentes (FAQ)</h2>
        <div className={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles.faqItem}>
              <button 
                className={styles.faqHeader} 
                onClick={() => toggleAccordion(index)}
              >
                {faq.question}
                <svg 
                  className={`${styles.faqIcon} ${openIndex === index ? styles.open : ''}`} 
                  viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div className={`${styles.faqBody} ${openIndex === index ? styles.open : ''}`}>
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Nous Contacter</h2>
        <div className={styles.contactGrid}>
          
          <a href="tel:+22501020304" className={styles.contactCard}>
            <div className={`${styles.contactIcon} ${styles.iconPhone}`}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <span className={styles.contactTitle}>Appeler</span>
            <span className={styles.contactDesc}>Tous les jours 10h-23h</span>
          </a>

          <a href="https://wa.me/22501020304" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
            <div className={`${styles.contactIcon} ${styles.iconWhatsapp}`}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <span className={styles.contactTitle}>WhatsApp</span>
            <span className={styles.contactDesc}>Réponse en 5 min</span>
          </a>

          <a href="mailto:support@foodora.ci" className={styles.contactCard}>
            <div className={`${styles.contactIcon} ${styles.iconEmail}`}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <span className={styles.contactTitle}>E-mail</span>
            <span className={styles.contactDesc}>Pour toute réclamation</span>
          </a>

        </div>
      </div>
    </div>
  )
}
