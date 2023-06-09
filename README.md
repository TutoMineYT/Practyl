# Practyl
Practyl es un panel de control para pterodactyl con el que podas crear servidores, user servidores, etc.

<img src= "https://cdn.discordapp.com/attachments/951734936539394088/1101944854432465007/image.png">

<a href="https://discord.gg/9jzCG6dKDG">Discord</a>

<h1>Requerimientos</h1>
<h2>- NodeJS > 18</h2>

<h1>Guia de instalacion.</h1>
<h3>1º PASO</h3>

```
git clone https://github.com/TutoMineYT/Practyl
```

<h3>2º PASO</h3>

```
cd Practyl
```

<h3>3º PASO</h3>

```
npm i
```

<h3>4º PASO</h3>

```
node .
```

<h1>Tener projecto 24/7</h1>
<h3>1º PASO</h3>

```
npm i -g pm2
```

<h3>2º PASO</h3>

```
cd DIRECTORIO && pm2 start index.js --name Practyl
```

<h3>3º PASO (Iniciar automaticamente con el sistema) - REQUIERE LINUX</h3>

```
pm2 startup
```

<h1>Guia de instalacion de NGINX (Linux systems)</h1>
<h3>1º PASO</h3>

```
apt update && apt upgrade
```

<h3>2º PASO</h3>

```
apt install nginx certbot python3-certbot-nginx
```

<h3>3º PASO</h3>

```
ln -s /etc/nginx/sites-available/practyl.conf /etc/nginx/sites-enabled/practyl.conf
```

<h3>4º PASO</h3>

```
nano /etc/nginx/sites-available/pracytl.conf
```

<h3>5º PASO</h3>
SE PONE DENTRO:

```
server {
    listen       80;
    server_name  <DOMINIO>;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

<h3>6º PASO</h3>

```
certbot --nginx -d <DOMINIO>
```

<h3>7º PASO</h3>

```
systemctl restart nginx
```
