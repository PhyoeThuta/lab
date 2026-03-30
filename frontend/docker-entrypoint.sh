#!/bin/sh
# Replace PORT variable in nginx.conf
PORT=${PORT:-8080}
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;'
