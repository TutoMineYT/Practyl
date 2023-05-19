const express = require("express");
const path = require("path");
const cookieSession = require('cookie-session')
const { crearDB } = require("megadb")
const database = new crearDB({ nombre: "database", carpeta: "database" })
const configJSON = new crearDB({ nombre: "config", carpeta: "config" })
const crypto = require('crypto');
const chalk = require('chalk');
const fs = require('fs');
let config = require("./config/config.json").config

const app = express()
require('express-ws')(app);
app.use(express.static(path.join(__dirname, "assets")))
app.use(express.json());
app.use(cookieSession({
    name: 'session',
    keys: ["Lx5PsVHFlzmn#8Oq^53&e5OUi0h^qp6UXxer0i%z#^5288sirc", "C*sE48PS6DHjo9A8nJY6^IV!!IkwkVqgVsX$kJEjmYV2RddbRA"]
}))
app.listen(8080)

  

fs.watchFile(__dirname + "/config/config.json", async () => {
    config = await configJSON.obtener("config")
})

console.log(chalk.red("===================================================================================="))
console.log(chalk.red("|                ") + chalk.blue(" ____                 _         _ ") + chalk.red("                                |"))
console.log(chalk.red("|                ") + chalk.blue("|  _ \\ _ __ __ _  ___| |_ _   _| |") + chalk.red("                                |"))
console.log(chalk.red("|                ") + chalk.blue("| |_) | '__/ _` |/ __| __| | | | |") + chalk.red("                                |"))
console.log(chalk.red("|                ") + chalk.blue("|  __/| | | (_| | (__| |_| |_| | |") + chalk.red("                                |"))
console.log(chalk.red("|                ") + chalk.blue("|_|   |_|  \\__,_|\\___|\\__|\\__, |_|") + chalk.red("                                |"))
console.log(chalk.red("|                ") + chalk.blue("                          |___/                        ") + chalk.red("           |"))
console.log(chalk.red("===================================================================================="))

console.log(chalk.bgGray("LOGS") + " -> " + chalk.blue("Starting Practyl..."))

function saveError(rej) {
    let date = new Date()
    let day = ("0" + date.getDate()).slice(-2);
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let time = date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds()
    let fileName = day + "-" + month + "-" + date.getFullYear() + "=" + time + ".txt"
    fs.writeFileSync(__dirname + "/errorslog/" + fileName, (rej.stack).toString())
    console.log(chalk.bgRed("ERROR") + " -> " + chalk.red("It has occured an uknown error, error log has been saved on ") + chalk.bgBlue(fileName) + chalk.red(" on the folder ") + chalk.bgBlue("errorslog") + chalk.red(", send it to our support server."))
}

process.on("uncaughtException", async (rej) => saveError(rej))
process.on("unhandledRejection", async (rej) => saveError(rej))
console.log(chalk.bgGray("LOGS") + " -> " + chalk.blue("Anti-Crash has been loaded."))

let password = random(10)
if (!configJSON.tiene("configured")) {
    console.log(chalk.bgRed("ERROR") + " -> " + chalk.red("The panel is not configured. Please configure it acceding to the website using this password: ") + chalk.bgGreen(password))
}

let cache = []

app.get("*", async (req, res, next) => {
    if (/mobile/i.test(req.headers['user-agent'])) return res.render("mobile/errors/device-not-supported.ejs", { req })
    if (!configJSON.tiene("configured") && req.path !== "/configure") return res.redirect("/configure")
    if (req.path === "/configure") return next()
    if (req.session.user) {
        let bloqued = ["/login", "/register"]
        if (bloqued.includes(req.originalUrl) && !(req.originalUrl).startsWith("/css") && !(req.originalUrl).startsWith("/img") && !(req.originalUrl).startsWith("/js")) return res.redirect("/")
        let email = req.session.user.email
        if (!database.tiene(`users.${email.replaceAll(".", "-")}`)) {
            delete req.session.user
            return res.redirect("/login")
        }
        let userinfo = await database.obtener(`users.${email.replaceAll(".", "-")}`)
        req.session.user = userinfo
        req.session.user.email = email
        req.session.user.panel = config.pterodactyl.link
        await fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(json => {
            cache = json.data
            let ui = json.data.find(data => data.attributes.email === (req.session.user.email).toLowerCase())
            if (!ui) {
                database.eliminar(`users.${email.replaceAll(".", "-")}`)
                delete req.session.user
                return res.redirect("/login")
            }
            if (ui.attributes.root_admin === true) {
                database.establecer(`users.${email.replaceAll(".", "-")}.admin`, true)
                req.session.user.admin = true
            }
            if (!userinfo.admin || userinfo.admin !== false) {
                if (ui.attributes.root_admin === false) {
                    database.establecer(`users.${email.replaceAll(".", "-")}.admin`, false)
                    req.session.user.admin = false
                }
            }
        })
    } else {
        let allowed = ["/", "/login", "/register", "/api/discord", "/api/callback", "/support"]
        if (!allowed.includes(req.originalUrl) && !(req.originalUrl).startsWith("/css") && !(req.originalUrl).startsWith("/img") && !(req.originalUrl).startsWith("/js") && !(req.originalUrl).startsWith("/api/callback")) return res.redirect("/login")
    }
    next()
})

app.get("/", async (req, res) => {
    res.render("computer/user/index.ejs", { req, config })
})

app.get("/login", async (req, res) => {
    res.render("computer/user/login.ejs", { req, config })
})

app.get("/register", async (req, res) => {
    res.render("computer/user/register.ejs", { req, config })
})

app.get("/api/logout", async (req, res) => {
    delete req.session.user
    res.redirect("/login")
})

app.get("/account", async (req, res) => {
    res.render("computer/user/account.ejs", { req, config })
})

app.get("/api/discord", async (req, res) => {
    if (!config.general || config.general.oauth2 !== true) return res.redirect("/login")
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${config.oauth2.id}&redirect_uri=${encodeURIComponent(config.general.protocol + config.general.domain + "/api/callback")}&response_type=code&scope=identify%20guilds%20guilds.join%20email`);
})

app.get("/configure", async (req, res) => {
    if (configJSON.tiene("configured")) return res.render("computer/errors/404.ejs", { req, config })
    let fakeConfig = {
        general: {
            name: "Configuring..."
        }
    }
    if (!req.session.configuration) return res.render("computer/configuration/access.ejs", { req, config: fakeConfig })
    res.render("computer/configuration/config.ejs", { req, config: fakeConfig })
})

app.get("/api/callback", async (req, res) => {
    if (!config.general || config.general.oauth2 !== true) return res.redirect("/login")
    if (!req.query.code) return res.redirect("/api/discord");
    let json = await fetch(
        'https://discord.com/api/oauth2/token',
        {
            method: "post",
            body: "client_id=" + config.oauth2.id + "&client_secret=" + config.oauth2.secret + "&grant_type=authorization_code&code=" + encodeURIComponent(req.query.code) + "&redirect_uri=" + encodeURIComponent(config.general.protocol + config.general.domain + "/api/callback"),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
    );

    if (json.ok == true) {
        let codeinfo = JSON.parse(await json.text());
        await fetch(
            'https://discord.com/api/users/@me',
            {
                method: "get",
                headers: {
                    "Authorization": `Bearer ${codeinfo.access_token}`
                }
            }
        ).then(res => res.json()).then(async json => {
            let username = (json.username).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "")
            let email = (json.email).replaceAll(".", "-")
            if (!database.tiene(`users.${email}`)) {
                database.establecer(`users.${email}.username`, username)
                database.establecer(`users.${email}.limits`, config.usuarios.limits)
                database.establecer(`users.${email}.used`, { "ram": 0, "disk": 0, "cpu": 0, "server": 0 })
                database.establecer(`users.${email}.coins`, 0)
                let BaseJSON = {
                    "email": json.email,
                    "username": username,
                    "first_name": username,
                    "last_name": username
                }
                fetch(config.pterodactyl.link + "/api/application/users", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'accept': 'application/json',
                        "Authorization": `Bearer ${config.pterodactyl.apikey}`
                    },
                    body: JSON.stringify(BaseJSON)
                }).catch(() => {
                    return res.render("computer/user/uknown.ejs", { req, config })
                })
            }
            let userinfo = await database.obtener(`users.${email}`)
            req.session.user = userinfo
            req.session.user.email = json.email
            res.redirect("/account")
        })


    }
})

app.get("/support", async (req, res) => {
    res.redirect(config.general.discord)
})

app.get("/server/list", async (req, res) => {
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.apikey}`
        }
    }).then(response => response.json()).then(json => {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(response => response.json()).then(async json2 => {
            let user = json2.data.find(data => data.attributes.email === req.session.user.email)
            let servers = []
            await json.data.forEach(server => {
                if (server.attributes.user === user.attributes.id) servers.push(server)
            })
            res.render("computer/user/server-list.ejs", { req, servers, config })
        }).catch(() => {
            return res.render("computer/user/uknown.ejs", { req, config })
        })
    }).catch(() => {
        return res.render("computer/user/uknown.ejs", { req, config })
    })

})

app.get("/server/create", async (req, res) => {
    let eggs = config.eggs
    if (!eggs) eggs = []
    res.render("computer/user/server-create.ejs", { req, eggs, config })
})

app.get("/store", async (req, res) => {
    if (!config.general || !config.general.storePage || config.general.storePage === false) return res.redirect("/")
    res.render("computer/user/store.ejs", { req, config })
})

app.get("/afk", async (req, res) => {
    if (!config.general || !config.general.afkPage || config.general.afkPage === false) return res.redirect("/")
    res.render("computer/user/afk.ejs", { req, config })
})

app.ws('/afkWB', async (ws, req) => {
    if (!config.general || !config.general.afkPage || config.general.afkPage === false) return ws.close(1000, "No permitido.")
    if (!req.session.user) return ws.close(1000, "No tienes un usuario.")
    if (req.session.user.afk && req.session.user.afk === true && process.uptime() > 10) return ws.close(1000, "Ya estas conectado, si crees que es un error borra las cookies.")
    let timer = setInterval(async () => {
        let count = await database.obtener(`users.${(req.session.user.email).replaceAll(".", "-")}.coins`)
        count = count + config.arcio.coins
        database.establecer(`users.${(req.session.user.email).replaceAll(".", "-")}.coins`, count)
    }, 1 * 60 * 1000)
    req.session.user.afk = true
    ws.on("close", () => {
        req.session.user.afk = false
        clearInterval(timer)
    })
});

app.get("/giftcard", async (req, res) => {
    res.render("computer/user/giftcard.ejs", { req, config })
})

app.get("/server/delete/:identifier", async (req, res) => {
    let email = (req.session.user.email).replaceAll(".", "-")
    if (!req.params.identifier) return res.redirect("/server/list")
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.apikey}`
        }
    }).then(response => response.json()).then(async json => {
        let server = json.data.find(data => data.attributes.identifier === req.params.identifier)
        if (!server) return res.redirect("/server/list")
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(async json2 => {
            let user = json2.data.find(data => data.attributes.email === req.session.user.email)
            if (server.attributes.user !== user.attributes.id) return res.redirect("/server/list")
            await fetch(config.pterodactyl.link + "/api/application/servers/" + server.attributes.id + "/force", {
                method: "DELETE",
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Bearer ${config.pterodactyl.apikey}`
                }
            }).catch(e => {
                return res.render("computer/user/uknown.ejs", { req, config })
            })
            database.restar(`users.${email}.used.server`, 1)
            database.restar(`users.${email}.used.ram`, server.attributes.limits.memory)
            database.restar(`users.${email}.used.cpu`, server.attributes.limits.cpu)
            database.restar(`users.${email}.used.disk`, server.attributes.limits.disk)
            res.redirect("/server/list")
        })
    }).catch(() => {
        return res.render("computer/user/uknown.ejs", { req, config })
    })
})

app.get("/server/:identifier", async (req, res) => {
    if (!req.params.identifier) return res.redirect("/server/list")
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.apikey}`
        }
    }).then(response => response.json()).then(json => {
        let server = json.data.find(data => data.attributes.identifier === req.params.identifier)
        if (!server) return res.redirect("/server/list")
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(response => response.json()).then(json2 => {
            let user = json2.data.find(data => data.attributes.email === req.session.user.email)
            if (!user) {
                delete req.session.user
                return res.redirect("/login")
            }
            if (server.attributes.user !== user.attributes.id) return res.redirect("/server/list")
            if (server.attributes.suspended === true) return res.redirect("/server/list")
            fetch(config.pterodactyl.link + "/api/application/nodes/" + server.attributes.node + "/allocations?per_page=100000", {
                method: "GET",
                headers: {
                    'content-type': 'application/json',
                    'accept': 'application/json',
                    'authorization': `Bearer ${config.pterodactyl.apikey}`
                }
            }).then(res => res.json()).then(json3 => {
                let allocation = json3.data.find(data => data.attributes.id === server.attributes.allocation)
                server.attributes.ipData = allocation.attributes
                if (req.session.user.key) {
                    fetch(config.pterodactyl.link + "/api/client/servers/" + server.attributes.identifier + "/websocket", {
                        method: "GET",
                        headers: {
                            'content-type': 'application/json',
                            'accept': 'application/json',
                            'authorization': 'Bearer ' + req.session.user.key
                        }
                    }).then(res => res.json()).then(json => {
                        if (json.errors) {
                            database.eliminar(`users.${(req.session.user.email).replaceAll(".", "-")}.key`)
                            return res.redirect("/server/list")
                        }
                        server.attributes.websocket = json.data
                        res.render("computer/user/server.ejs", { req, server, config })
                    }).catch(() => {
                        return res.render("computer/user/uknown.ejs", { req, config })
                    })
                } else {
                    res.render("computer/user/server.ejs", { req, server, config })
                }
            }).catch(() => {
                return res.render("computer/user/uknown.ejs", { req, config })
            })
        }).catch(() => {
            return res.render("computer/user/uknown.ejs", { req, config })
        })

    }).catch(() => {
        return res.render("computer/user/uknown.ejs", { req, config })
    })

})

app.get("/admin/user/list", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!database.tiene("users")) database.establecer("users", {})
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    res.render("computer/admin/users-list.ejs", { req, users, config })
})
app.get("/admin/user/:username", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!req.params.username) return res.redirect("/admin/user/list")
    if (!database.tiene("users")) database.establecer("users", {})
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.params.username)
    res.render("computer/admin/user.ejs", { req, user, config })
})
app.get("/admin/user/delete/:username", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!req.params.username) return res.redirect("/admin/user/list")
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.params.username)
    database.eliminar(`users.${(user.email).replaceAll(".", "-")}`)
    res.redirect("/admin/user/list")
})


app.get("/admin/giftcard/list", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!database.tiene("giftcards")) database.establecer("giftcards", {})
    let giftcardJSON = await database.obtener("giftcards")
    let giftcards = Object.values(giftcardJSON)
    res.render("computer/admin/giftcard-list.ejs", { req, giftcards, config })
})
app.get("/admin/giftcard/delete/:code", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!req.params.code) return res.redirect("/admin/giftcard/list")
    database.eliminar(`giftcards.${req.params.code}`)
    res.redirect("/admin/giftcard/list")
})
app.get("/admin/giftcard/create", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/giftcard-create.ejs", { req, config })
})

app.get("/admin/config/list", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/list.ejs", { req, config })
})
app.get("/admin/config/general", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/general.ejs", { req, config })
})
app.get("/admin/config/usuarios", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/usuarios.ejs", { req, config })
})
app.get("/admin/config/tienda", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/tienda.ejs", { req, config })
})
app.get("/admin/config/pterodactyl", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/pterodactyl.ejs", { req, config })
})

// CAMBIAR
app.get("/admin/config/nests", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    fetch(config.pterodactyl.link + "/api/application/nests", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.apikey}`
        }
    }).then(res => res.json()).then(json => {

        res.render("computer/admin/configuration/nests.ejs", { req, config, nests: json.data })
    })
})
app.get('/admin/config/nest/:nestID', async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!req.params.nestID) return res.redirect("/admin/config/nests")
    fetch(config.pterodactyl.link + "/api/application/nests/" + req.params.nestID + "/eggs?include=variables", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.apikey}`
        }
    }).then(res => res.json()).then(json => {
        res.render("computer/admin/configuration/eggs.ejs", { req, config, eggs: json.data })
    })
})

app.get("/admin/config/addegg/:nestID/:eggID", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if (!req.params.nestID || !req.params.eggID) return res.redirect("/admin/config/nests")
    res.render("computer/admin/configuration/addegg.ejs", { req, config, eggID: req.params.eggID, nestID: req.params.nestID })
})

app.get("/admin/config/oauth2", async (req, res) => {
    if (!req.session.user) return res.redirect("/")
    if (!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("computer/admin/configuration/oauth2.ejs", { req, config })
})






app.post("/api/login", async (req, res) => {
    if(!config.general.emailLogin || config.general.emailLogin !== true) return res.json({ icon: "error", timer: 2500, message: "No permitido."})
    let email = (req.body.email).replaceAll(".", "-")
    let hash = hashPassword(req.body.password)
    if (!database.tiene(`users.${email}`) || !database.tiene(`users.${email}.password`) || (await database.obtener(`users.${email}.password`)) !== hash) return res.json({ icon: "error", timer: 2500, message: "No hay una cuenta con esa informacion." })
    let userinfo = await database.obtener(`users.${email}`)
    req.session.user = userinfo
    req.session.user.email = req.body.email
    res.json({ icon: "success", timer: 2500, message: "Logeado correctamente.", link: "/" })
})

app.post("/api/register", async (req, res) => {
    if(!config.general.emailLogin || config.general.emailLogin !== true) return res.json({ icon: "error", timer: 2500, message: "No permitido."})
    let email = (req.body.email).replaceAll(".", "-")
    if (!database.tiene(`users`)) database.establecer("users", {})
    if (database.tiene(`users.${email}`)) return res.json({ icon: "error", timer: 2500, message: "Ya existe un usuario con ese correo." })
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.body.username)
    if (user) return res.json({ icon: "error", timer: 2500, message: "Ya existe un usuario con ese username." })
    if (req.body.password !== req.body.passwordConfirm) return res.json({ icon: "error", timer: 2500, message: "Las contraseñas no coinciden." })
    let hash = hashPassword(req.body.password)
    database.establecer(`users.${email}.password`, hash)
    database.establecer(`users.${email}.username`, req.body.username)
    database.establecer(`users.${email}.limits`, config.usuarios.limits)
    database.establecer(`users.${email}.email`, req.body.email)
    database.establecer(`users.${email}.used`, { "ram": 0, "disk": 0, "cpu": 0, "server": 0 })
    database.establecer(`users.${email}.coins`, 0)
    res.json({ icon: "success", timer: 2500, message: "Registrado correctamente.", link: "/login" })

    let username = (req.body.username).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "")
    let BaseJSON = {
        "email": req.body.email,
        "username": username,
        "first_name": username,
        "last_name": username
    }
    fetch(config.pterodactyl.link + "/api/application/users", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            "Authorization": `Bearer ${config.pterodactyl.apikey}`
        },
        body: JSON.stringify(BaseJSON)
    })
})


app.post("/api/panel", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ "errorCode": 401, "message": "Unauthenticated." })
    if (!req.body.action) return res.status(404).json({ "errorCode": 404, "message": "Not found." })
    let email = (req.session.user.email).replaceAll(".", "-")
    if (req.body.action === "create-server") {
        if (!req.body.data.type || !req.body.data.cpu || !req.body.data.ram || !req.body.data.disk) return res.json({ icon: "error", timer: 5000, message: "Debes de rellenar todos los campos." })
        let egg = config.eggs.find(egg => egg.display === req.body.data.type)

        let limits = {
            "cpu": parseInt(req.body.data.cpu),
            "ram": parseInt(req.body.data.ram),
            "disk": parseInt(req.body.data.disk)
        }
        if ((req.session.user.limits.maxSERVER - req.session.user.used.server) <= 0) return res.json({ icon: "error", timer: 5000, message: "No tienes suficientes SEVIDORES disponible." })
        if (limits.cpu > (req.session.user.limits.maxCPU - req.session.user.used.cpu)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente CPU disponible." })
        if (limits.ram > (req.session.user.limits.maxRAM - req.session.user.used.ram)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente RAM disponible." })
        if (limits.disk > (req.session.user.limits.maxDISK - req.session.user.used.disk)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente DISCO disponible." })
        if (egg.minimun.cpu && limits.cpu < egg.minimun.cpu) return res.json({ icon: "error", timer: 5000, message: `La CPU debe superar el ${egg.minimun.cpu}%` })
        if (egg.minimun.ram && limits.ram < egg.minimun.ram) return res.json({ icon: "error", timer: 5000, message: `La RAM debe superar ${egg.minimun.ram}MB` })
        if (egg.minimun.disk && limits.disk < egg.minimun.disk) return res.json({ icon: "error", timer: 5000, message: `El disco debe superar el ${egg.minimun.disk}MB` })
        if (egg.maximum.cpu && limits.cpu > egg.maximum.cpu) return res.json({ icon: "error", timer: 5000, message: `La CPU no debe superar el ${egg.maximum.cpu}%` })
        if (egg.maximum.ram && limits.ram > egg.maximum.ram) return res.json({ icon: "error", timer: 5000, message: `La RAM no debe superar ${egg.maximum.ram}MB` })
        if (egg.maximum.disk && limits.disk > egg.maximum.disk) return res.json({ icon: "error", timer: 5000, message: `El disco no debe superar el ${egg.maximum.disk}MB` })
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(json => {
            let user = json.data.find(data => data.attributes.email === req.session.user.email)
            let BaseJSON = {
                "name": req.body.data.name ?? req.body.data.type,
                "user": user.attributes.id,
                "egg": egg.info.id,
                "docker_image": egg.info.docker_image,
                "startup": egg.info.startup,
                "environment": egg.info.environment,
                "limits": {
                    "memory": limits.ram,
                    "swap": -1,
                    "disk": limits.disk,
                    "io": 500,
                    "cpu": limits.cpu
                },
                "feature_limits": {
                    "databases": 1,
                    "backups": 1
                },
                "allocation": {
                    "default": 1,
                    "additional": [0]
                },
                "deploy": {
                    "locations": [1],
                    "dedicated_ip": false,
                    "port_range": []
                },
            }
            fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    "Authorization": `Bearer ${config.pterodactyl.apikey}`
                },
                body: JSON.stringify(BaseJSON)
            }).then(res => res.json()).then(json2 => {
                res.json({ icon: "success", timer: 2500, message: "Servidor creado con exito.", link: "/server/list" })
                database.sumar(`users.${email}.used.server`, 1)
                database.sumar(`users.${email}.used.ram`, limits.ram)
                database.sumar(`users.${email}.used.cpu`, limits.cpu)
                database.sumar(`users.${email}.used.disk`, limits.disk)
            }).catch(() => {
                return res.json({ icon: "error", message: "No se pudo conectar con el servidor", timer: 2500 })
            })
        }).catch(() => {
            return res.json({ icon: "error", message: "No se pudo conectar con el servidor", timer: 2500 })
        })
    }
    if (req.body.action === "update-key") {
        if (!req.body.data.key) {
            database.eliminar(`users.${(req.session.user.email).replaceAll(".", "-")}.key`)
            return res.json({ icon: "success", timer: 2500, message: "La client key ha sido borrada con exito." })
        }
        fetch(config.pterodactyl.link + "/api/client", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': 'Bearer ' + req.body.data.key
            }
        }).then(res => res.json()).then(json => {
            if (json.errors) return res.json({ icon: "error", timer: 2500, message: "Debes poner una client key valida." })
            database.establecer(`users.${(req.session.user.email).replaceAll(".", "-")}.key`, req.body.data.key)
            return res.json({ icon: "success", timer: 5000, message: "La client key a sido establecida con exito." })
        }).catch(() => {
            return res.json({ icon: "error", message: "No se pudo conectar con el servidor", timer: 2500 })
        })
    }
    if (req.body.action === "buy-resources") {
        if (!config.general || !config.general.storePage || config.general.storePage === false) return res.redirect("/")
        let types = ["server", "cpu", "ram", "disk"]
        if (!types.includes(req.body.data.type)) return res.json({ icon: "error", message: "El tipo es invalido.", timer: 2500 })
        if (!req.body.data.count || isNaN(req.body.data.count)) return res.json({ icon: "error", message: "Debes rellenar el precio de " + req.body.data.type + ".", timer: 2500 })
        if (req.body.data.count > config.tienda["buy-limit"][req.body.data.type]) return res.json({ icon: "error", message: `El maximo que puedes comprar de ${req.body.data.type} es ${config.tienda["buy-limit"][req.body.data.type]}`, timer: 2500 })
        let price = parseInt(req.body.data.count) * config.tienda[req.body.data.type]
        if (req.session.user.coins < price) return res.json({ icon: "error", message: `No tienes suficientes coins, necesitas ${price - req.session.user.coins} coins.`, timer: 2500 })
        database.restar(`users.${email}.coins`, price)
        database.sumar(`users.${email}.limits.max${(req.body.data.type).toUpperCase()}`, req.body.data.count)
        res.json({ icon: "success", timer: 5000, message: `${req.body.data.count} ${req.body.data.type} ha sido añadido a su cuenta.` })
    }
    if (req.body.action === "reset-password") {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(json => {
            let user = json.data.find(data => data.attributes.email === req.session.user.email)
            if (!user) {
                delete req.session.user,
                    res.redirect("/login")
            }
            let password = random(8)
            let BaseJSON = {
                "email": user.attributes.email,
                "username": user.attributes.username,
                "first_name": user.attributes.first_name,
                "last_name": user.attributes.last_name,
                "language": user.attributes.language,
                "password": password
            }
            fetch(config.pterodactyl.link + "/api/application/users/" + user.attributes.id, {
                method: "PATCH",
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    "Authorization": `Bearer ${config.pterodactyl.apikey}`
                },
                body: JSON.stringify(BaseJSON)
            }).then(res => res.json()).then(json2 => {
                if (json2.errors) return res.json({ icon: "error", message: "Hubo un error al restablecer la contraseña.", timer: 2500 })
                res.json({ icon: "success", message: `La contraseña ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000 })
            })
        })
    }
    if (req.body.action === "claim-giftcard") {
        if (!req.body.data.code) return res.json({ icon: "error", message: "Debes poner un codigo.", timer: 2500 })
        if (!database.tiene(`giftcards.${req.body.data.code}`)) return res.json({ icon: "error", message: "El codigo no existe.", timer: 2500 })
        let codeInfo = await database.obtener(`giftcards.${req.body.data.code}`)
        if (codeInfo.claimedBy.includes(email)) return res.json({ icon: "error", message: "Ya has canjeado este codigo.", timer: 2500 })
        if (codeInfo.maxUses && codeInfo.maxUses <= codeInfo.uses) return res.json({ icon: "error", message: "El codigo ya ha alcanzado el maximo de usos.", timer: 2500 })
        if (codeInfo.maxUses) database.sumar(`giftcards.${req.body.data.code}.uses`, 1)
        database.sumar(`users.${email}.coins`, codeInfo.coins)
        codeInfo.claimedBy.push(email)
        database.establecer(`giftcards.${req.body.data.code}.claimedBy`, codeInfo.claimedBy)
        res.json({ icon: "success", message: "El codigo ha sido reclamado con exito.", timer: 2500 })
    }
})
console.log(chalk.bgGray("LOGS") + " -> " + chalk.blue("User API has been loaded."))

app.post("/api/admin", async (req, res) => {
    if (!req.session.user) return res.status(401).json({ "errorCode": 401, "message": "Unauthenticated." })
    if (!req.session.user.admin || req.session.user.admin !== true) return res.status(401).json({ "errorCode": 401, "message": "Unauthenticated." })
    if (!req.body.action) return res.status(404).json({ "errorCode": 404, "message": "Not found." })

    if (req.body.action === "create-giftcard") {
        if (!req.body.data.coins) return res.json({ icon: "error", message: "Debes poner las coins que quieres dar." })
        if (!req.body.data.code) req.body.data.code = random(8)
        database.establecer(`giftcards.${req.body.data.code}.coins`, req.body.data.coins)
        database.establecer(`giftcards.${req.body.data.code}.code`, req.body.data.code)
        database.establecer(`giftcards.${req.body.data.code}.claimedBy`, [])
        database.establecer(`giftcards.${req.body.data.code}.uses`, 0)
        if (req.body.data.maxUses) database.establecer(`giftcards.${req.body.data.code}.maxUses`, parseInt(req.body.data.maxUses))
        res.json({ icon: "success", timer: 2500, link: "/admin/giftcard/list", message: "La tarjeta de regalo ha sido creada con exito." })
    }
    if (req.body.action === "update-key") {
        let usersJSON = await database.obtener("users")
        let users = Object.values(usersJSON)
        let user = users.find(data => data.username === req.body.data.username)
        if (!req.body.data.key) {
            database.eliminar(`users.${(user.email).replaceAll(".", "-")}.key`)
            return res.json({ icon: "success", timer: 2500, message: "La client key ha sido borrada con exito." })
        }
        fetch(config.pterodactyl.link + "/api/client", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': 'Bearer ' + req.body.data.key
            }
        }).then(res => res.json()).then(json => {
            if (json.errors) return res.json({ icon: "error", timer: 2500, message: "Debes poner una client key valida." })
            database.establecer(`users.${(user.email).replaceAll(".", "-")}.key`, req.body.data.key)
            return res.json({ icon: "success", timer: 5000, message: "La client key a sido establecida con exito." })
        }).catch(() => {
            return res.json({ icon: "error", message: "No se pudo conectar con el servidor", timer: 2500 })
        })
    }
    if (req.body.action === "reset-password") {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(json => {
            let user = json.data.find(data => data.attributes.username === (req.body.data.username).toLowerCase())
            let password = random(8)
            let BaseJSON = {
                "email": user.attributes.email,
                "username": user.attributes.username,
                "first_name": user.attributes.first_name,
                "last_name": user.attributes.last_name,
                "language": user.attributes.language,
                "password": password
            }
            fetch(config.pterodactyl.link + "/api/application/users/" + user.attributes.id, {
                method: "PATCH",
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    "Authorization": `Bearer ${config.pterodactyl.apikey}`
                },
                body: JSON.stringify(BaseJSON)
            }).then(res => res.json()).then(json2 => {
                if (json2.errors) return res.json({ icon: "error", message: "Hubo un error al restablecer la contraseña.", timer: 2500 })
                res.json({ icon: "success", message: `La contraseña ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000 })
            })
        })
    }
    if (req.body.action === "reset-password-dash") {
        let usersJSON = await database.obtener("users")
        let users = Object.values(usersJSON)
        let user = users.find(data => data.username === req.body.data.username)
        let password = random(8)
        database.establecer(`users.${(user.email).replaceAll(".", "-")}.password`, hashPassword(password))
        res.json({ icon: "success", message: `La contraseña del dash ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000 })
    }
})

console.log(chalk.bgGray("LOGS") + " -> " + chalk.blue("Admin API has been loaded."))

app.post("/api/configuration", async (req, res) => {
    if(!req.body.action || !req.body.data) return;
    if (req.body.action === "access") {
        if (configJSON.tiene("configured")) return;
        if (!req.body.data.password) return res.json({ icon: "error", message: "Debes poner la contraseña.", timer: 2500 })
        if (req.body.data.password !== password) return res.json({ icon: "error", message: "La contraseña no es correcta.", timer: 2500 })
        req.session.configuration = true
        return res.json({ icon: "success", message: "La contraseña es correcta, redirigiendo.", link: "/configure", timer: 2500 })
    }
    if (req.body.action === "configure") {
        if (configJSON.tiene("configured")) return;
        if (!req.session.configuration) return res.redirect("/")
        if (!req.body.data.dDomain || !req.body.data.pDomain || !req.body.data.pKey || !req.body.data.limits.maxRAM || !req.body.data.limits.maxCPU || !req.body.data.limits.maxDISK || !req.body.data.limits.maxSERVER) return res.json({ icon: "error", message: "Debes rellenar todo.", timer: 2500 })
        let protocol = "http://"
        if ((req.body.data.dDomain).startsWith("https://")) protocol = "https://"
        configJSON.establecer("config.general.domain", (req.body.data.dDomain).replaceAll("http://", "").replaceAll("https://", ""))
        configJSON.establecer("config.general.protocol", protocol)
        configJSON.establecer("config.general.emailLogin", true)
        configJSON.establecer("config.pterodactyl.link", req.body.data.pDomain)
        configJSON.establecer("config.pterodactyl.apikey", req.body.data.pKey)
        configJSON.establecer("config.usuarios.limits", req.body.data.limits)
        // configJSON.establecer("config.arcio.enabled", false)
        configJSON.establecer("configured", true)
        delete req.session.configuration
        return res.json({ icon: "success", message: "Configuracion establecida, dash habilitada.", link: "/", timer: 2500 })
    }
    if (req.body.action === "addegg") {
        if (!req.body.data || !req.body.data.egg || !req.body.data.egg.nestID || !req.body.data.egg.eggID || !req.body.data.limits || !req.body.data.limits.min || !req.body.data.limits.min.cpu || !req.body.data.limits.min.ram || !req.body.data.limits.min.disk || !req.body.data.limits.max || !req.body.data.limits.max.cpu || !req.body.data.limits.max.ram || !req.body.data.limits.max.disk) return res.json({ icon: "error", message: "Debes rellenar todos los campos.", timer: 2500 })
        fetch(config.pterodactyl.link + "/api/application/nests/" + req.body.data.egg.nestID + "/eggs/" + req.body.data.egg.eggID + "?include=variables", {
            method: "GET",
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.apikey}`
            }
        }).then(res => res.json()).then(async json => {
            if (!configJSON.tiene("config.eggs")) configJSON.establecer("config.eggs", [])
            let eggs = await configJSON.obtener("config.eggs")
            if (eggs.find(egg => egg.info.id === parseInt(req.body.data.egg.eggID))) return res.json({ icon: "error", message: "El EGG ya existe.", timer: 2500 })
            let eggVariables =  {

            }
            let newEGG = {
                "display": json.attributes.name,
                "minimun": {
                    "ram": parseInt(req.body.data.limits.min.ram),
                    "disk": parseInt(req.body.data.limits.min.disk),
                    "cpu": parseInt(req.body.data.limits.min.cpu)
                },
                "maximum": {
                    "ram": parseInt(req.body.data.limits.max.ram),
                    "disk": parseInt(req.body.data.limits.max.disk),
                    "cpu": parseInt(req.body.data.limits.max.cpu)
                },
                info: {
                    "id": parseInt(req.body.data.egg.eggID),
                    "docker_image": json.attributes["docker_image"],
                    "startup": json.attributes["startup"],
                    "environment": {}
,                    "feature_limits": {
                        "databases": 1,
                        "backups": 1,
                        "allocation": 1
                    }
                }
            }
            
            let variables = json.attributes.relationships.variables.data
            await variables.forEach(variable => {
                newEGG.info.environment[variable.attributes.env_variable] = variable.attributes.default_value
            })
            eggs.push(newEGG)
            configJSON.establecer("config.eggs", eggs)
        })
    }
    if (req.body.action === "save-general") {
        if (!req.body.data.domain) return res.json({ icon: "error", message: "No puedes dejar el campo de dominio vacio.", timer: 2500 })
        if (!(req.body.data.domain).includes("http://") && !(req.body.data.domain).includes("https://")) return res.json({ icon: "error", message: "El dominio es invalido.", timer: 2500 })
        req.body.data.protocol = "http://"
        if ((req.body.data.domain).startsWith("https://")) req.body.data.protocol = "https://"
        req.body.data.domain = (req.body.data.domain).replace("http://", "").replace("https://", "")
        configJSON.establecer("config.general", req.body.data)
        res.json({ icon: "success", message: "Configuracion guardada con exito.", timer: 2500 })
    }
    if (req.body.action === "save-pterodactyl") {
        if (!req.body.data.link || !req.body.data.apikey) return res.json({ icon: "error", message: "No se puede dejar ningun campo vacio. Es necesario para el funcionamiento de la dashboard." })
        configJSON.establecer("config.pterodactyl", req.body.data)
        res.json({ icon: "success", message: "Configuracion guardada con exito.", timer: 2500 })
    }
    if (req.body.action === "save-usuarios") {
        if (!req.body.data.limits.maxRAM || !req.body.data.limits.maxCPU || !req.body.data.limits.maxDISK || !req.body.data.limits.maxSERVER) return res.json({ icon: "error", message: "No se puede dejar ningun campo vacio. Es necesario para el funcionamiento de la dashboard." })
        configJSON.establecer("config.usuarios", req.body.data)
        res.json({ icon: "success", message: "Configuracion guardada con exito.", timer: 2500 })
    }
    if(req.body.action === "save-tienda") {
        if(!req.body.data.prices || !req.body.data.prices.ram || !req.body.data.prices.cpu || !req.body.data.prices.disk || !req.body.data.prices.server || !req.body.data.prices["buy-limit"] || !req.body.data.prices["buy-limit"].ram  || !req.body.data.prices["buy-limit"].cpu  || !req.body.data.prices["buy-limit"].disk || !req.body.data.prices["buy-limit"].server) return res.json({ icon: "error", message: "No puedes dejar ningun campo vacio.", timer: 2500})
        configJSON.establecer("config.tienda", req.body.data.prices)
        res.json({ icon: "success", message: "Configuracion guardada con exito.", timer: 2500 })
    }
    if(req.body.action === "save-oauth2") {
        configJSON.establecer("config.oauth2", req.body.data)
        res.json({ icon: "success", message: "Configuracion guardada con exito.", timer: 2500 })
    }
})

console.log(chalk.bgGray("LOGS") + " -> " + chalk.blue("Configuration API has been loaded."))

app.use((req, res) => {
    res.render("computer/errors/404.ejs", { req, config })
})

function hashPassword(password) {
    const hash = crypto.createHash('sha512');
    hash.update(password);
    return hash.digest('hex');
}
function random(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

console.log(chalk.bgGreen("SUCCESS") + " -> " + chalk.blue("Practyl has been started."))
