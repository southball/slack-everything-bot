FROM node:18

COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn install

COPY . .

CMD yarn start
