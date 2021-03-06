FROM node:10-alpine

RUN apk add graphviz ttf-freefont

RUN apk add python
RUN apk add make
RUN apk add git

# 앱 디렉터리 생성
WORKDIR /usr/src/app

# 앱 소스 추가
COPY . .
# COPY .env .env

RUN npm install
# 프로덕션을 위한 코드를 빌드하는 경우
# RUN npm ci --only=production

# Expose is NOT supported by Heroku
# EXPOSE 80

# CMD ["npm", "start" ]