FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/ 

RUN npm install --omit=dev
COPY . .

RUN npx prisma generate

ENV UPLOAD_DIR /app/uploads

RUN adduser -D appuser

RUN mkdir -p ${UPLOAD_DIR}

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

CMD ["node", "index.js"]