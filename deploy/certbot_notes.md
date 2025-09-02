# HTTPS via Let's Encrypt
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d enterprise.superior-overseas.com
sudo systemctl status certbot.timer
