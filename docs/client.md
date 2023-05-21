## Client

The client can be used to upload files, and download and redeem paid invoices.

### Usage
```
Usage: htvm [options] [command]

Options:
  -h, --help          display help for command

Commands:
  xpub [options]      Generate a new xpub (bip32) file
  lock [options]      Write the htvm-lock.json file
  host [options]      Write the .htvm-host file
  walk [options]      Walk the directory tree
  diff [options]      Diff local and server files
  publish [options]   Publish the files to the host
  status [options]    Check api status
  payments [options]  Transfer invoice payments from the server
  wipe [options]      Wipe the server
  tx [options]        Process a tx, marking outputs as spent. (The tx should have already been broadcast)
  redeem [options]    create tx spending to address (tx hex is printed to stdout)
  show
  help [command]      display help for command
```

#### 1. Example 
```
>mkdir sitePath
>cd sitePath

# create a keypair to receive payments
sitePath> htvm xpub --random

# generates .htvm-host file, be sure to put the key in your server config
sitePath> htvm host --url https://example.com

# create a pricelist
sitePath> nano pricelist.json

# publish the files. the differences are calculated by downloading the 
# htvm-lock.json file and comparing to the current lock file. note that 
# you can use any method to update the server directory, but this will 
# only work properly if the lock files are correct.
sitePath> htvm publish

# download the payments
sitePath> htvm payments
sitePath> htvm show balance

# transfer the funds to your main wallet
sitePath> htvm redeem -b -p --address <bitcoinAddress>
sitePath> htvm show invoices

```