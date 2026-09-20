/**
 * Change le mot de passe d'un compte, sans passer par un email.
 * Utile pour le compte gérant, dont l'adresse n'est pas une vraie boîte mail.
 *
 *   node scripts/set-password.js boss@bestpizza.com
 *
 * Le mot de passe est demandé à la saisie : il ne s'affiche pas à l'écran,
 * et n'apparaît ni dans l'historique du terminal ni dans ce fichier.
 */
const readline = require('readline')
const { Writable } = require('stream')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local', quiet: true })

const email = process.argv[2]

// Sortie qu'on peut rendre muette pendant la frappe du mot de passe
const maskedOutput = new Writable({
  write(chunk, encoding, callback) {
    if (!maskedOutput.muted) process.stdout.write(chunk, encoding)
    callback()
  },
})

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const rl = readline.createInterface({ input: process.stdin, output: maskedOutput, terminal: true })
    maskedOutput.muted = true
    rl.question('', (answer) => {
      maskedOutput.muted = false
      process.stdout.write('\n')
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Entrée redirigée (tests, scripts) : on lit simplement les lignes
function readPipedLines() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data.split('\n').map((line) => line.trim())))
  })
}

function fail(message) {
  console.error(message)
  process.stdin.pause()
  process.exitCode = 1
}

async function main() {
  if (!email) {
    return fail('Usage : node scripts/set-password.js <email>')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fail('Variables manquantes dans .env.local (URL Supabase et clé service_role).')
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    return fail(`Lecture des comptes impossible : ${error.message}`)
  }

  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    return fail(`Aucun compte avec l'adresse ${email}`)
  }

  let password
  let confirm
  if (process.stdin.isTTY) {
    password = await askHidden(`Nouveau mot de passe pour ${email} : `)
    confirm = await askHidden('Confirmez le mot de passe : ')
  } else {
    const lines = await readPipedLines()
    password = lines[0]
    confirm = lines[1] ?? lines[0]
  }

  if (!password || password.length < 8) {
    return fail('Trop court : 8 caractères minimum.')
  }
  if (password !== confirm) {
    return fail('Les deux saisies sont différentes.')
  }

  const { error: updateError } = await db.auth.admin.updateUserById(user.id, { password })
  if (updateError) {
    return fail(`Changement refusé : ${updateError.message}`)
  }

  process.stdin.pause()
  console.log(`Mot de passe changé pour ${email}.`)
}

main()
