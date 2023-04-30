const express = require("express");
const path = require("path");
const cookieSession = require('cookie-session')
const { crearDB } = require("megadb")
const database = new crearDB({ nombre: "database", carpeta: "database" })
const crypto = require('crypto');
const chalk = require('chalk');
const config = require("./config.json")

const app = express()
require('express-ws')(app);
app.use(express.static(path.join(__dirname, "assets")))
app.use(express.json());
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
}))
app.listen(80)

console.log(chalk.red("===================================================================================="))
console.log(chalk.red("|                ") + chalk.blue(" ____                 _         _ ") + chalk.red("                                 |"))
console.log(chalk.red("|                ") + chalk.blue("|  _ \\ _ __ __ _  ___| |_ _   _| |") + chalk.red("                                 |"))
console.log(chalk.red("|                ") + chalk.blue("| |_) | '__/ _` |/ __| __| | | | |")  + chalk.red("                                 |"))
console.log(chalk.red("|                ") + chalk.blue("|  __/| | | (_| | (__| |_| |_| | |")  + chalk.red("                                 |"))
console.log(chalk.red("|                ") + chalk.blue("|_|   |_|  \\__,_|\\___|\\__|\\__, |_|") + chalk.red("                                 |"))
console.log(chalk.red("|                ") + chalk.blue("                          |___/                        ") + chalk.red("            |"))
console.log(chalk.red("===================================================================================="))

app.get("*", async (req, res, next) => {
    if (!config.discordLogin.domain || !config.discordLogin.id || !config.discordLogin.protocol || !config.discordLogin.secret || !config.information.discordLink || !config.information.name) return res.render("user/error.ejs" , { req, config })
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
    } else {
        let allowed = ["/", "/login", "/register", "/api/discord", "/api/callback", "/support"]
        if (!allowed.includes(req.originalUrl) && !(req.originalUrl).startsWith("/css") && !(req.originalUrl).startsWith("/img") && !(req.originalUrl).startsWith("/js") && !(req.originalUrl).startsWith("/api/callback")) return res.redirect("/login")
    }
    next()
})

app.get("/", async (req, res) => {
    res.render("user/index.ejs", { req, config })
})

app.get("/login", async (req, res) => {
    res.render("user/login.ejs", { req, config })
})

app.get("/register", async (req, res) => {
    res.render("user/register.ejs", { req, config })
})

app.get("/api/logout", async (req, res) => {
    delete req.session.user
    res.redirect("/login")
})

app.get("/account", async (req, res) => {
    res.render("user/account.ejs", { req, config })
})

app.get("/api/discord", function (req, res) {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${config.discordLogin.id}&redirect_uri=${encodeURIComponent(config.discordLogin.protocol + config.discordLogin.domain + "/api/callback")}&response_type=code&scope=identify%20guilds%20guilds.join%20email`);
})


app.get("/api/callback", async (req, res) => {
    if (!req.query.code) return res.redirect("/api/discord");
    let json = await fetch(
        'https://discord.com/api/oauth2/token',
        {
            method: "post",
            body: "client_id=" + config.discordLogin.id + "&client_secret=" + config.discordLogin.secret + "&grant_type=authorization_code&code=" + encodeURIComponent(req.query.code) + "&redirect_uri=" + encodeURIComponent(config.discordLogin.protocol + config.discordLogin.domain + "/api/callback"),
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
                database.establecer(`users.${email}.limits`, config.users.default)
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
                        "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
                    },
                    body: JSON.stringify(BaseJSON)
                }).catch(() => {
                    return res.render("user/error.ejs", { req, config })
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
    res.redirect(config.information.discordLink)
})

app.get("/server/list", async (req, res) => {
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
        }
    }).then(response => response.json()).then(json => {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
            }
        }).then(response => response.json()).then(async json2 => {
            let user = json2.data.find(data => data.attributes.email === req.session.user.email)
            let servers = []
            await json.data.forEach(server => {
                if (server.attributes.user === user.attributes.id) servers.push(server)
            })
            res.render("user/server-list.ejs", { req, servers, config })
        }).catch(() => {
            return res.render("user/error.ejs", { req, config })
        })
    }).catch(() => {
        return res.render("user/error.ejs", { req, config })
    })

})

app.get("/server/create", async (req, res) => {
    let eggs = config.eggs
    res.render("user/server-create.ejs", { req, eggs, config })
})

app.get("/store", async(req, res) => {
    res.render("user/store.ejs", { req, config })
})

app.get("/afk", async(req, res) => {
    res.render("user/afk.ejs", { req, config })
})

app.ws('/afkWB', async (ws, req) => {
    if(!req.session.user) return ws.close(1000, "No tienes un usuario.")
    if(req.session.user.afk && req.session.user.afk === true && process.uptime() > 10) return ws.close(1000, "Ya estas conectado, si crees que es un error borra las cookies.")
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

app.get("/giftcard", async(req, res) => {
    res.render("user/giftcard.ejs", { req, config })
})

app.get("/server/delete/:identifier", async (req, res) => {
    let email = (req.session.user.email).replaceAll(".", "-")
    if (!req.params.identifier) return res.redirect("/server/list")
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
        }
    }).then(response => response.json()).then(async json => {
        let server = json.data.find(data => data.attributes.identifier === req.params.identifier)
        if (!server) return res.redirect("/server/list")
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
            }
        }).then(res => res.json()).then(async json2 => {
            let user = json2.data.find(data => data.attributes.email === req.session.user.email)
            if(server.attributes.user !== user.attributes.id) return res.redirect("/server/list")
            await fetch(config.pterodactyl.link + "/api/application/servers/" + server.attributes.id + "/force", {
                method: "DELETE",
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
                }
            }).catch(e => {
                return res.render("user/error.ejs", { req, config })
            })
            database.restar(`users.${email}.used.server`, 1)
            database.restar(`users.${email}.used.ram`, server.attributes.limits.memory)
            database.restar(`users.${email}.used.cpu`, server.attributes.limits.cpu)
            database.restar(`users.${email}.used.disk`, server.attributes.limits.disk)
            res.redirect("/server/list")
        })
    }).catch(() => {
        return res.render("user/error.ejs", { req, config })
    })
})

app.get("/server/:identifier", async (req, res) => {
    if (!req.params.identifier) return res.redirect("/server/list")
    fetch(config.pterodactyl.link + "/api/application/servers?per_page=100000", {
        method: "GET",
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
        }
    }).then(response => response.json()).then(json => {
        let server = json.data.find(data => data.attributes.identifier === req.params.identifier)
        if (!server) return res.redirect("/server/list")
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
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
                    'authorization': `Bearer ${config.pterodactyl.auth.apikey}`
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
                        res.render("user/server.ejs", { req, server, config })
                    }).catch(() => {
                        return res.render("user/error.ejs", { req, config })
                    })
                } else {
                    res.render("user/server.ejs", { req, server, config })
                }
            }).catch(() => {
                return res.render("user/error.ejs", { req, config })
            })
        }).catch(() => {
            return res.render("user/error.ejs", { req, config })
        })

    }).catch(() => {
        return res.render("user/error.ejs", { req, config })
    })

})

app.get("/admin/user/list", async (req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if(!database.tiene("users")) database.establecer("users", {})
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    res.render("admin/users-list.ejs", { req, users, config })
})
app.get("/admin/user/:username", async(req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if(!req.params.username) return res.redirect("/admin/user/list")
    if(!database.tiene("users")) database.establecer("users", {})
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.params.username)
    res.render("admin/user.ejs", { req, user, config })
})
app.get("/admin/user/delete/:username", async(req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if(!req.params.username) return res.redirect("/admin/user/list")
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.params.username)
    database.eliminar(`users.${(user.email).replaceAll(".", "-")}`)
    res.redirect("/admin/user/list")
})


app.get("/admin/giftcard/list", async(req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if(!database.tiene("giftcards")) database.establecer("giftcards", {})
    let giftcardJSON = await database.obtener("giftcards")
    let giftcards = Object.values(giftcardJSON)
    res.render("admin/giftcard-list.ejs", { req, giftcards, config })
})
app.get("/admin/giftcard/delete/:code", async(req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    if(!req.params.code) return res.redirect("/admin/giftcard/list")
    database.eliminar(`giftcards.${req.params.code}`)
    res.redirect("/admin/giftcard/list")
})
app.get("/admin/giftcard/create", async(req, res) => {
    if(!req.session.user) return res.redirect("/")
    if(!req.session.user.admin || req.session.user.admin !== true) return res.redirect("/")
    res.render("admin/giftcard-create.ejs", { req, config })
})

app.post("/api/login", async (req, res) => {
    let email = (req.body.email).replaceAll(".", "-")
    let hash = hashPassword(req.body.password)
    if (!database.tiene(`users.${email}`) || !database.tiene(`users.${email}.password`) || (await database.obtener(`users.${email}.password`)) !== hash) return res.json({ icon: "error", timer: 2500, message: "No hay una cuenta con esa informacion." })
    let userinfo = await database.obtener(`users.${email}`)
    req.session.user = userinfo
    req.session.user.email = req.body.email
    res.json({ icon: "success", timer: 2500, message: "Logeado correctamente.", link: "/" })
})

app.post("/api/register", async (req, res) => {
    let email = (req.body.email).replaceAll(".", "-")
    if (database.tiene(`users.${email}`)) return res.json({ icon: "error", timer: 2500, message: "Ya existe un usuario con ese correo." })
    let usersJSON = await database.obtener("users")
    let users = Object.values(usersJSON)
    let user = users.find(data => data.username === req.body.username)
    if(user) return res.json({ icon: "error", timer: 2500, message: "Ya existe un usuario con ese username." })
    if (req.body.password !== req.body.passwordConfirm) return res.json({ icon: "error", timer: 2500, message: "Las contraseñas no coinciden." })
    let hash = hashPassword(req.body.password)
    database.establecer(`users.${email}.password`, hash)
    database.establecer(`users.${email}.username`, req.body.username)
    database.establecer(`users.${email}.limits`, config.users.default)
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
            "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
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
        if ((req.session.user.limits.server - req.session.user.used.server) <= 0) return res.json({ icon: "error", timer: 5000, message: "No tienes suficientes SEVIDORES disponible." })
        if (limits.cpu > (req.session.user.limits.cpu - req.session.user.used.cpu)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente CPU disponible." })
        if (limits.ram > (req.session.user.limits.ram - req.session.user.used.ram)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente RAM disponible." })
        if (limits.disk > (req.session.user.limits.disk - req.session.user.used.disk)) return res.json({ icon: "error", timer: 5000, message: "No tienes suficiente DISCO disponible." })

        if (egg.minimum.cpu && limits.cpu < egg.minimum.cpu) return res.json({ icon: "error", timer: 5000, message: `La CPU debe superar el ${egg.minimum.cpu}%` })
        if (egg.minimum.ram && limits.ram < egg.minimum.ram) return res.json({ icon: "error", timer: 5000, message: `La RAM debe superar ${egg.minimum.ram}MB` })
        if (egg.minimum.disk && limits.disk < egg.minimum.disk) return res.json({ icon: "error", timer: 5000, message: `El disco debe superar el ${egg.minimum.disk}MB` })
        if (egg.maximum.cpu && limits.cpu > egg.maximum.cpu) return res.json({ icon: "error", timer: 5000, message: `La CPU no debe superar el ${egg.maximum.cpu}%` })
        if (egg.maximum.ram && limits.ram > egg.maximum.ram) return res.json({ icon: "error", timer: 5000, message: `La RAM no debe superar ${egg.maximum.ram}MB` })
        if (egg.maximum.disk && limits.disk > egg.maximum.disk) return res.json({ icon: "error", timer: 5000, message: `El disco no debe superar el ${egg.maximum.disk}MB` })
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
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
                    "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
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
    if(req.body.action === "buy-resources") {
        let types = ["server", "cpu", "ram", "disk"]
        if(!types.includes(req.body.data.type)) return res.json({ icon: "error", message: "El tipo es invalido.", timer: 2500 })
        if(!req.body.data.count || isNaN(req.body.data.count)) return res.json({ icon: "error", message: "Debes rellenar el precio de " + req.body.data.type + ".", timer: 2500 })
        if(req.body.data.count > config.store["buy-limit"][req.body.data.type]) return res.json({ icon: "error", message: `El maximo que puedes comprar de ${req.body.data.type} es ${config.store["buy-limit"][req.body.data.type]}`, timer: 2500 })
        let price = parseInt(req.body.data.count) * config.store[req.body.data.type]
        if(req.session.user.coins < price) return res.json({ icon: "error", message: `No tienes suficientes coins, necesitas ${price - req.session.user.coins} coins.`, timer: 2500 })
        database.restar(`users.${email}.coins`, price)
        database.sumar(`users.${email}.limits.${req.body.data.type}`, req.body.data.count)
        res.json({ icon: "success", timer: 5000, message: `${req.body.data.count} ${req.body.data.type} ha sido añadido a su cuenta.`})
    }
    if(req.body.action === "reset-password") {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
            }
        }).then(res => res.json()).then(json => {
            let user = json.data.find(data => data.attributes.email === req.session.user.email)
            if(!user) {
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
                    "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
                },
                body: JSON.stringify(BaseJSON)
            }).then(res => res.json()).then(json2 => {
                if(json2.errors) return res.json({ icon: "error", message: "Hubo un error al restablecer la contraseña.", timer: 2500})
                res.json({ icon: "success", message: `La contraseña ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000})
            })
        })
    }
    if(req.body.action === "claim-giftcard") {
        if(!req.body.data.code) return res.json({ icon: "error", message: "Debes poner un codigo.", timer: 2500})
        if(!database.tiene(`giftcards.${req.body.data.code}`)) return res.json({ icon: "error", message: "El codigo no existe.", timer: 2500})
        let codeInfo = await database.obtener(`giftcards.${req.body.data.code}`)
        if(codeInfo.claimedBy.includes(email)) return res.json({ icon: "error", message: "Ya has canjeado este codigo.", timer: 2500})
        if(codeInfo.maxUses && codeInfo.maxUses <= codeInfo.uses) return res.json({ icon: "error", message: "El codigo ya ha alcanzado el maximo de usos.", timer: 2500})
        if(codeInfo.maxUses) database.sumar(`giftcards.${req.body.data.code}.uses`, 1)
        database.sumar(`users.${email}.coins`, codeInfo.coins)
        codeInfo.claimedBy.push(email)
        database.establecer(`giftcards.${req.body.data.code}.claimedBy`, codeInfo.claimedBy)
        res.json({ icon: "success", message: "El codigo ha sido reclamado con exito.", timer: 2500})
    }
})

app.post("/api/admin", async(req, res) => {
    if (!req.session.user) return res.status(401).json({ "errorCode": 401, "message": "Unauthenticated." })
    if(!req.session.user.admin || req.session.user.admin !== true) return res.status(401).json({ "errorCode": 401, "message": "Unauthenticated." })
    if (!req.body.action) return res.status(404).json({ "errorCode": 404, "message": "Not found." })

    if(req.body.action === "create-giftcard") {
        if(!req.body.data.coins) return res.json({ icon: "error", message: "Debes poner las coins que quieres dar."})
        if(!req.body.data.code) req.body.data.code = random(8)
        database.establecer(`giftcards.${req.body.data.code}.coins`, req.body.data.coins)
        database.establecer(`giftcards.${req.body.data.code}.code`, req.body.data.code)
        database.establecer(`giftcards.${req.body.data.code}.claimedBy`, [])
        database.establecer(`giftcards.${req.body.data.code}.uses`, 0)
        if(req.body.data.maxUses) database.establecer(`giftcards.${req.body.data.code}.maxUses`, parseInt(req.body.data.maxUses))
        res.json({ icon: "success", timer: 2500, link: "/admin/giftcard/list", message: "La tarjeta de regalo ha sido creada con exito."})
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
    if(req.body.action === "reset-password") {
        fetch(config.pterodactyl.link + "/api/application/users?per_page=100000", {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
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
                    "Authorization": `Bearer ${config.pterodactyl.auth.apikey}`
                },
                body: JSON.stringify(BaseJSON)
            }).then(res => res.json()).then(json2 => {
                if(json2.errors) return res.json({ icon: "error", message: "Hubo un error al restablecer la contraseña.", timer: 2500})
                res.json({ icon: "success", message: `La contraseña ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000})
            })
        })
    }
    if(req.body.action === "reset-password-dash") {
        let usersJSON = await database.obtener("users")
        let users = Object.values(usersJSON)
        let user = users.find(data => data.username === req.body.data.username)
        let password = random(8)
        database.establecer(`users.${(user.email).replaceAll(".", "-")}.password`, hashPassword(password))
        res.json({ icon: "success", message: `La contraseña del dash ha sido restablecida correctamente.<br>La nueva es: <b>${password}</b>`, timer: 20000})
    }
})


app.use((req, res) => {
    res.render("user/404.ejs", { req, config })
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