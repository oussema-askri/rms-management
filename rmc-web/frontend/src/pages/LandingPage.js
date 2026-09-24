// frontend/src/pages/LandingPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="logo">
            <span className="logo-icon">⚓</span>
            <span className="logo-text">RMS</span>
          </div>
          <div className="nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#about">À propos</a>
            <a href="#contact">Contact</a>
            <button onClick={handleLoginClick} className="btn-login-nav">
              Connexion
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Gestion de Réparation Marine
              <span className="hero-subtitle">Simplifiée</span>
            </h1>
            <p className="hero-description">
              Système de gestion complet pour les entreprises de réparation marine en Tunisie.
              Gérez les clients, le planning, les dépenses, les employés et les bons de réception en un seul endroit.
            </p>
            <div className="hero-buttons">
              <button onClick={handleLoginClick} className="btn-primary">
                Commencer
              </button>
              <button className="btn-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                En savoir plus
              </button>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-illustration">
              <div className="illustration-circle circle-1"></div>
              <div className="illustration-circle circle-2"></div>
              <div className="illustration-circle circle-3"></div>
              <div className="illustration-icon">🚢</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">Fonctionnalités Clés</h2>
          <p className="section-description">
            Tout ce dont vous avez besoin pour gérer efficacement votre activité de réparation marine
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">◫</div>
              <h3>Gestion des Clients</h3>
              <p>Structure client hiérarchique avec unités et sous-titres. Numérotation automatique.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">≡</div>
              <h3>Planning de Travail</h3>
              <p>Planifiez et assignez les tâches aux employés. Suivez les matériaux et l'avancement.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">◈</div>
              <h3>Suivi des Dépenses</h3>
              <p>Soumettez et approuvez les dépenses avec téléchargement de factures. Filtrage avancé.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⊹</div>
              <h3>Gestion des Employés</h3>
              <p>Gérez les données des employés, leur disponibilité, salaires et primes. RH complet.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⊟</div>
              <h3>Bons de Réception</h3>
              <p>Génération automatique des bons de réception à la fin des tâches. Signature et téléchargement DOCX.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">◎</div>
              <h3>Demandes d'Accès</h3>
              <p>Créez et gérez les demandes d'accès aux sites avec les détails ouvriers et véhicules.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="section-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Gestion Numérique</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">3</div>
              <div className="stat-label">Rôles Utilisateurs</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Accès Partout</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">∞</div>
              <div className="stat-label">Évolutivité</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">À propos de RMS</h2>
              <p>
                RMS (RIYADA Management &amp; Services) est un système de gestion complet conçu
                spécifiquement pour les entreprises de réparation marine en Tunisie. Notre
                plateforme simplifie tous les aspects de vos opérations commerciales.
              </p>
              <p>
                De la gestion des clients à la planification des employés, du suivi des dépenses
                à la génération de documents, RMS fournit tous les outils nécessaires pour gérer
                votre activité efficacement.
              </p>
              <div className="about-features">
                <div className="about-feature-item">
                  <span className="check-icon">✓</span>
                  <span>Contrôle d'accès basé sur les rôles</span>
                </div>
                <div className="about-feature-item">
                  <span className="check-icon">✓</span>
                  <span>Génération automatique de documents</span>
                </div>
                <div className="about-feature-item">
                  <span className="check-icon">✓</span>
                  <span>Suivi en temps réel</span>
                </div>
                <div className="about-feature-item">
                  <span className="check-icon">✓</span>
                  <span>Stockage sécurisé des données</span>
                </div>
              </div>
            </div>
            <div className="about-image">
              <div className="about-illustration">
                <div className="about-icon">⚓</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="roles-section">
        <div className="section-container">
          <h2 className="section-title">Rôles Utilisateurs</h2>
          <p className="section-description">Différents niveaux d'accès pour chaque membre de l'équipe</p>

          <div className="roles-grid">
            <div className="role-card">
              <div className="role-icon employer">◈</div>
              <h3>Employé</h3>
              <ul className="role-features">
                <li>Créer des entrées de planning</li>
                <li>Soumettre des dépenses</li>
                <li>Consulter les clients</li>
                <li>Consulter les bons de réception</li>
                <li>Consulter les demandes d'accès</li>
              </ul>
            </div>

            <div className="role-card featured">
              <div className="role-badge">Le plus utilisé</div>
              <div className="role-icon rh">⊹</div>
              <h3>RH (Ressources Humaines)</h3>
              <ul className="role-features">
                <li>Toutes les permissions Employé</li>
                <li>Gérer les employés</li>
                <li>Approuver / rejeter les dépenses</li>
                <li>Modifier les entrées de planning</li>
                <li>Signer les bons de réception</li>
                <li>Créer des demandes d'accès</li>
              </ul>
            </div>

            <div className="role-card">
              <div className="role-icon admin">⊞</div>
              <h3>Admin</h3>
              <ul className="role-features">
                <li>Accès complet au système</li>
                <li>Toutes les permissions RH</li>
                <li>Supprimer tout enregistrement</li>
                <li>Consulter les statistiques</li>
                <li>Configuration du système</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Prêt à commencer?</h2>
          <p>Rejoignez RMS dès aujourd'hui et simplifiez votre gestion de réparation marine</p>
          <button onClick={handleLoginClick} className="btn-cta">
            Accéder au Tableau de bord
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h3>
              <span className="logo-icon">⚓</span>
              RMS
            </h3>
            <p>Gestion de Réparation Marine - Tunisie</p>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <p>Contact@rms.tn</p>
            <p>+216 92 01 96 54</p>
            <p>rue nouiri bhar lazreg LA MARSA</p>
          </div>

          <div className="footer-section">
            <h4>Liens rapides</h4>
            <a href="#features">Fonctionnalités</a>
            <a href="#about">À propos</a>
            <a href="#contact">Contact</a>
            <a onClick={handleLoginClick}>Connexion</a>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <a href="#">Documentation</a>
            <a href="#">Centre d'aide</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 RMS - Gestion de Réparation Marine. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;