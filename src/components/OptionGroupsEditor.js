'use client'

import styles from './OptionGroupsEditor.module.css'

// Identifiant stable d'un choix : il ne change pas si le gérant renomme le choix,
// pour que les paniers déjà remplis restent valables
const newId = () => Math.random().toString(36).slice(2, 10)

// Modèles pour aller vite
const TEMPLATES = [
  { name: 'Taille', type: 'single', choices: [['Moyenne', 0], ['Grande', 1000]] },
  { name: 'Formule', type: 'single', choices: [['Seul', 0], ['Menu frites + boisson', 1500]] },
  { name: 'Suppléments', type: 'multiple', choices: [['Fromage', 500]] },
  { name: 'Boisson', type: 'single', choices: [['Coca-Cola', 0], ['Fanta', 0]] },
]

/** Les choix vides ou sans nom sont retirés avant l'enregistrement. Renvoie { groups, error }. */
export function cleanOptionGroups(groups = []) {
  const clean = groups
    .map((g) => ({
      ...g,
      name: String(g.name || '').trim(),
      choices: (g.choices || [])
        .map((c) => ({ ...c, label: String(c.label || '').trim(), price: Math.max(0, Math.round(Number(c.price) || 0)) }))
        .filter((c) => c.label),
    }))
    .filter((g) => g.name || g.choices.length)

  for (const g of clean) {
    if (!g.name) return { error: 'Donnez un nom à chaque choix (ex : Taille).' }
    if (g.choices.length === 0) return { error: `« ${g.name} » n’a aucune possibilité.` }
  }
  return { groups: clean }
}

/**
 * Les choix d'un plat, modifiés par le gérant : taille, formule, suppléments…
 * `value` / `onChange` : la liste option_groups du plat.
 */
export default function OptionGroupsEditor({ value = [], onChange }) {
  const groups = Array.isArray(value) ? value : []
  const update = (i, patch) => onChange(groups.map((g, k) => (k === i ? { ...g, ...patch } : g)))
  const updateChoice = (i, j, patch) => update(i, { choices: groups[i].choices.map((c, k) => (k === j ? { ...c, ...patch } : c)) })

  const addGroup = (template) => onChange([...groups, {
    id: newId(),
    name: template?.name || '',
    type: template?.type || 'single',
    choices: (template?.choices || [['', 0]]).map(([label, price]) => ({ id: newId(), label, price })),
  }])

  return (
    <div className={styles.editor}>
      {groups.length === 0 && (
        <p className={styles.empty}>Aucun choix : le plat se commande tel quel.</p>
      )}

      {groups.map((g, i) => (
        <div key={g.id} className={styles.group}>
          <div className={styles.groupHead}>
            <input
              className={styles.groupName}
              value={g.name}
              placeholder="Nom du choix (ex : Taille)"
              onChange={(e) => update(i, { name: e.target.value })}
              aria-label="Nom du choix"
            />
            <button type="button" className={styles.remove} onClick={() => onChange(groups.filter((_, k) => k !== i))} aria-label={`Retirer ${g.name || 'ce choix'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className={styles.typeSwitch} role="radiogroup" aria-label="Comment le client choisit">
            <button type="button" role="radio" aria-checked={g.type !== 'multiple'} className={g.type !== 'multiple' ? styles.typeOn : ''} onClick={() => update(i, { type: 'single' })}>
              Un seul au choix
            </button>
            <button type="button" role="radio" aria-checked={g.type === 'multiple'} className={g.type === 'multiple' ? styles.typeOn : ''} onClick={() => update(i, { type: 'multiple' })}>
              Plusieurs possibles
            </button>
          </div>
          <p className={styles.typeHelp}>
            {g.type === 'multiple'
              ? 'Le client en coche autant qu’il veut, ou aucun (suppléments).'
              : 'Le client en choisit un. Le premier est proposé par défaut.'}
          </p>

          <div className={styles.choices}>
            {g.choices.map((c, j) => (
              <div key={c.id} className={styles.choice}>
                <input
                  className={styles.choiceLabel}
                  value={c.label}
                  placeholder={g.type === 'multiple' ? 'Ex : Bacon' : 'Ex : Grande'}
                  onChange={(e) => updateChoice(i, j, { label: e.target.value })}
                  aria-label="Nom de la possibilité"
                />
                <label className={styles.priceField}>
                  <span>+</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    inputMode="numeric"
                    value={c.price}
                    onChange={(e) => updateChoice(i, j, { price: e.target.value })}
                    aria-label="Prix ajouté"
                  />
                  <span>FCFA</span>
                </label>
                <button type="button" className={styles.removeChoice} onClick={() => update(i, { choices: g.choices.filter((_, k) => k !== j) })} aria-label="Retirer cette possibilité">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addChoice} onClick={() => update(i, { choices: [...g.choices, { id: newId(), label: '', price: 0 }] })}>
            + Ajouter une possibilité
          </button>
        </div>
      ))}

      <div className={styles.addRow}>
        <span className={styles.addLabel}>Ajouter un choix :</span>
        {TEMPLATES.map((t) => (
          <button key={t.name} type="button" className={styles.template} onClick={() => addGroup(t)}>
            {t.name}
          </button>
        ))}
        <button type="button" className={styles.template} onClick={() => addGroup()}>Autre…</button>
      </div>
    </div>
  )
}
