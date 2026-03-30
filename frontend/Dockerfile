FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set environment variables for API endpoints
ENV REACT_APP_API_BASE=""
ENV REACT_APP_AUTH_URL="https://auth-service-331164391857.asia-southeast1.run.app"
ENV REACT_APP_USER_URL="https://user-service-331164391857.asia-southeast1.run.app"
ENV REACT_APP_ORDER_URL="https://order-service-331164391857.asia-southeast1.run.app"

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
