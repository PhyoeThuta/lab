#!/bin/sh
# Replace PORT variable in nginx.conf (default to 8080)
PORT=${PORT:-8080}
sed -i "s/listen 8080;/listen ${PORT};/" /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;'
