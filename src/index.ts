import { App } from "@slack/bolt";
import NodeCache from "node-cache";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const postChannelId = process.env.SLACK_CHANNEL_ID;

if (!postChannelId) {
  throw new Error("SLACK_CHANNEL_ID is not set");
}

const cacheFunction = <T extends NodeCache.Key, U>(
  func: (t: T) => Promise<U>,
  ttl: number
): ((t: T) => Promise<U>) => {
  const cache = new NodeCache({ stdTTL: ttl });
  return async (t: T) => {
    const cachedValue: U | undefined = cache.get(t);
    if (cachedValue) return cachedValue;
    const result = await func(t);
    cache.set(t, result);
    return result;
  };
};

const getChannelNameFromId = cacheFunction(
  (channelId: string) =>
    app.client.conversations
      .info({ channel: channelId })
      .then((info) => info.channel?.name),
  600
);

const getUserProfileFromId = cacheFunction(
  (userId: string) => app.client.users.profile.get({ user: userId }),
  600
);

const isBlacklistedChannel = (channelName?: string) => {
  return channelName?.includes("dark") || channelName?.includes("r18");
};

app.message(async ({ message }) => {
  app.client.conversations.info({ channel: message.channel });
  if (message.subtype === undefined && !message.bot_id) {
    const channelName = await getChannelNameFromId(message.channel);
    const userProfile = await getUserProfileFromId(message.user);

    if (isBlacklistedChannel(channelName)) {
      return;
    }

    app.client.chat.postMessage({
      channel: postChannelId,
      username: userProfile.profile?.display_name,
      icon_url: userProfile.profile?.image_512,
      text: `\`<#${message.channel}>\` ${message.text}`,
    });
  }
});

(async () => {
  // Start your app
  await app.start();
  await app.client.conversations.join({ channel: postChannelId });
  console.log("⚡️ Bolt app is running!");
})();
