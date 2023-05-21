
## Setup Guide 

### 1. Install Deno  
See https://deno.land/ for details

### 2. Install Code
Download the source code.    
```
git clone https://github.com/pyramids33/htvm ~/htvm 
```

### 3. Make a directory for your site
```
mkdir <sitePath>
```

### 4. Point domain to your server IP
Create a DNS A record to point to the IP address of your server.  


### 5. Get a domain certificate
You need a domain name to accept payments.  
Here is an example using certbot/nginx:    
```
sudo certbot certonly --nginx -d example.com
```

### 6. Create a config file
```
// example.config.json
{
    // the listen options passed to oak.
    // if not using a reverse proxy, provide the cert and keyfile options
    "listenOptions": {
        "port": 42069,
        "hostname": "127.0.0.1"
    },
    
    // use strong random values for cookie signing
    "cookieSecret": [ "blah" ],
    
    // env or dev. if env equals dev, the paywall can be bypassed by calling window.devpay().
    // Change to 'prod' on a real site.
    "env": "dev",

    // whether to log errors or not (passed to oak)
    "logErrors": true,

    // The path to content. The API will upload or delete these files. It is not necessary to use
    // the API to update it. It can be populated by any method.
    "contentPath": "~/mysite/files/",

    // The path for server data. Invoices and other server state are stored here.
    "dataPath": "~/mysite/data/",

    // Custom static files location. This is where the html for the paywall is stored.
    // By default this is the source code server/static folder.
    "staticPath": undefined,

    // Create the directories on startup
    "ensureDirs": true, 
    
    // Authentication key to use the API. Should be a random 32 bytes as hex string.
    "adminKey": "" 

    // Your domain name
    "domain": "yourdomain.com",

    // mAPI endpoints for tx broadcast
    "mAPIEndpoints": [{
        "name": "dev",
        "url": "http://localdev:3001/dev/tx",
        "extraHeaders": { "Content-Type": "application/json" } 
    }]
}
```

### 7. Run Server
Start the server using your config file.  This can be done as a systemctl service for example. 
Here is an example bash script to run the server
```
# unstable is required due to flock function

#!/bin/bash
cd ~/<sitePath>
~/.deno/bin/deno run \
--allow-read=config.json,data,files,<pathToSource>/server/static/ \
--allow-write=data,files \
--allow-net=127.0.0.1:<port> \
--unstable \
<pathToSource>/server/main.ts config.json

```

### 8. Nginx Reverse Proxy
Example nginx config for reverse proxy

```
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;
    server_tokens off;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    client_max_body_size 50M;

    location /.protected/ {
        internal;
        alias   /sitePath;
    }

    location /.bip270/invoice-sse {
        proxy_set_header    X-Forwarded-For $remote_addr;
        proxy_set_header    Host $http_host;
        proxy_pass          http://127.0.0.1:42069/.bip270/invoice-sse;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 3600;
        proxy_buffering off;
        proxy_cache off;
    }
    location / {
        proxy_set_header   X-Forwarded-For $remote_addr;
        proxy_set_header   Host $http_host;
        proxy_pass         http://127.0.0.1:42069/;
    }
}

```

## API Endpoints

The API accepts multipart-formdata requests.   
The header 'x-authkey' must be set to a valid key (see config setting adminKey).  

### /.api/status
Returns a json object containing the server status. Useful for testing connectivity.  
@return {{ status: string }} Object indicating the status  


### /.api/walk
Walks the content directory tree.  
@return {[ relativePath:string, size:number, mtime:number ][]} Array of file entries.  


### /.api/download
Downloads a file at a urlPath  
@param {string} urlPath - Relative path to the file  
@return File content  


### /.api/upload
Upload a file to a urlPath  
@param {string} filePath - Relative path to the file  
@param {file} fileData - The file contents  
@return An empty object or { error:string }  


### /.api/delete
Delete one or more files  
@param {string} delete - A list of file paths to delete (new line separated)  
@return An empty object or { error:string }  


### /.api/wipe
Deletes all content files  
@return An empty object or { error:string }  


### /.api/rename
Rename one or more files  
@param {string} rename - A new line separated list of filePath pairs to rename from and to.   
    E.g, The filePath on the first line will be renamed to the filePath on the second line, and so on.   
@return An empty object or { error:string }  


### /.api/payments/delete
Delete payments. Only delete the payments after downloading and saving them.  
@param {string} delete - A new line separated list invoice ids.   
@return An empty object or { error:string }  


### /.api/payments
Download a batch of payments.
@return Array<Invoice>


### /.bip270/invoice-sse
Listen for payment notification. Used on the paywall page. 
@param {string} invoiceId   
@return An empty object or { error:string }  

### /.bip270/new-invoice
Create a new invoice. If there is already a recent invoice for the urlPath, it returns that.
@param {string} urlPath   
@return {
    id:string,
    urlPath:string,
    subtotal:number,
    dataURL:string,
    expiry:number 
} 

### /.bip270/payment-request
Bip270 payment request for an invoice.
@param {string} queryString.invoiceId
@param {string} queryString.sessionId   
@return {
    network:string
    outputs: Array<{script:string,amount:number}>,
    creationTimestamp:number,
    expirationTimestamp:number,
    memo:string,
    paymentUrl:string,
    merchantData:string
}

### /.bip270/pay-invoice
Bip270 payment for an invoice.
@param {string} queryString.invoiceId
@param {string} queryString.sessionId   
@param {string} body.transaction - hex encoded string  
@return { 
    payment: { transaction:string }, 
    memo:string, 
    error:number 
}