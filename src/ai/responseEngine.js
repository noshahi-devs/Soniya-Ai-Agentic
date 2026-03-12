const withTone = (romanticTone, romanticText, neutralText) => (
  romanticTone ? romanticText : neutralText
);

export const buildOpenAppResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Main ready hoon, jani. Aap pooch sakte hain kis kis ka message aya hai, main batati hoon.',
    'Main ready hoon. Aap pooch sakte hain kis kis ka message aya hai, main batati hoon.'
  )
);

export const buildLaunchAppSuccessResponse = (appName, romanticTone) => (
  withTone(
    romanticTone,
    `Theek hai, jani. Main ${appName} khol rahi hoon.`,
    `Theek hai. Main ${appName} khol rahi hoon.`
  )
);

export const buildLaunchAppMissingResponse = (appName, romanticTone) => (
  withTone(
    romanticTone,
    `${appName} is device par installed nahi mili, jani.`,
    `${appName} is device par installed nahi mili.`
  )
);

export const buildLaunchAppUnavailableResponse = (appName, romanticTone) => (
  withTone(
    romanticTone,
    `Main ${appName} tab khol sakti hoon jab Android dev build aur native bridge active ho, jani.`,
    `Main ${appName} tab khol sakti hoon jab Android dev build aur native bridge active ho.`
  )
);

export const buildPinRequiredResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'PIN verify kar dein, jani. Verification hone ke baad main private info dikha sakti hoon.',
    'PIN verify kar dein. Verification hone ke baad main private info dikha sakti hoon.'
  )
);

export const buildPinVerifiedResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'PIN verified, jaan. Main pending request ab handle karti hoon.',
    'PIN verified. Main pending request ab handle karti hoon.'
  )
);

export const buildPinRejectedResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Yeh PIN sahi nahi hai, jani. Dobara try karein.',
    'Yeh PIN sahi nahi hai. Dobara try karein.'
  )
);

export const buildSenderListResponse = (senders, romanticTone) => {
  const formattedList = senders.map((sender, index) => `${index + 1}. ${sender}`).join('\n');
  return withTone(
    romanticTone,
    `Aaj messages aaye hain, jani:\n${formattedList}`,
    `Aaj messages aaye hain:\n${formattedList}`
  );
};

export const buildReadMessageResponse = (message, romanticTone) => (
  withTone(
    romanticTone,
    `${message.sender} pooch rahe hain:\n${message.body}`,
    `${message.sender} pooch rahe hain:\n${message.body}`
  )
);

export const buildReplyPromptResponse = (message, romanticTone) => (
  withTone(
    romanticTone,
    `${message.sender} ko jawab bhejna hai? "Likho ..." keh kar draft bata dein, jani.`,
    `${message.sender} ko jawab bhejna hai? "Likho ..." keh kar draft bata dein.`
  )
);

export const buildReplyDraftResponse = (message, draftText, romanticTone, askBeforeReply) => (
  askBeforeReply
    ? withTone(
      romanticTone,
      `Draft ready hai, jaan:\n"${draftText}"\nAgar bhejna hai to Send dabayen.`,
      `Draft ready hai:\n"${draftText}"\nAgar bhejna hai to Send dabayen.`
    )
    : withTone(
      romanticTone,
      `Maine ${message.sender} ke liye yeh jawab save kar liya hai:\n"${draftText}"`,
      `Maine ${message.sender} ke liye yeh jawab save kar liya hai:\n"${draftText}"`
    )
);

export const buildReplySentResponse = (message, draftText, romanticTone) => (
  withTone(
    romanticTone,
    `Maine ${message.sender} ko jawab bhej diya hai, jani:\n"${draftText}"`,
    `Maine ${message.sender} ko jawab bhej diya hai:\n"${draftText}"`
  )
);

export const buildIgnoreResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Theek hai, jani. Main is notification ko ignore kar rahi hoon.',
    'Theek hai. Main is notification ko ignore kar rahi hoon.'
  )
);

export const buildLockResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Privacy lock dobara active kar diya gaya hai, jaan.',
    'Privacy lock dobara active kar diya gaya hai.'
  )
);

export const buildMissingMessageResponse = (senderQuery, romanticTone) => (
  withTone(
    romanticTone,
    `Mujhe ${senderQuery} ka message nahi mila, jani.`,
    `Mujhe ${senderQuery} ka message nahi mila.`
  )
);

export const buildUnknownCommandResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Jani, yeh command clear nahi thi. Try karein: "Kis kis ka message aya hai?" ya "Nabeel ka message open karo".',
    'Yeh command clear nahi thi. Try karein: "Kis kis ka message aya hai?" ya "Nabeel ka message open karo".'
  )
);

export const buildCallSuccessResponse = (contactName, romanticTone) => (
  withTone(
    romanticTone,
    `Theek hai, jani. Main ${contactName} ko call kar rahi hoon.`,
    `Theek hai. Main ${contactName} ko call kar rahi hoon.`
  )
);

export const buildCallFailedResponse = (contactName, romanticTone) => (
  withTone(
    romanticTone,
    `Main ${contactName} ko call nahi kar pa rahi, jani. Phone app ya permissions check karein.`,
    `Main ${contactName} ko call nahi kar pa rahi. Phone app ya permissions check karein.`
  )
);

export const buildScrollResponse = (direction, romanticTone) => (
  withTone(
    romanticTone,
    `Ji jani, main ${direction === 'UP' ? 'upar' : 'niche'} scroll kar rahi hoon.`,
    `Theek hai, main ${direction === 'UP' ? 'upar' : 'niche'} scroll kar rahi hoon.`
  )
);

export const buildSearchResponse = (query, romanticTone) => (
  withTone(
    romanticTone,
    `Theek hai, jani. Main "${query}" ke liye search kar rahi hoon.`,
    `Theek hai. Main "${query}" ke liye search kar rahi hoon.`
  )
);

export const buildSystemAdjustResponse = (target, action, romanticTone) => {
  const targetName = target === 'VOLUME' ? 'awaz' : 'roshni';
  const actionName = action === 'INCREASE' ? 'barha' : 'kam kar';
  return withTone(
    romanticTone,
    `Ji jani, main ${targetName} ${actionName} rahi hoon.`,
    `Theek hai. Main ${targetName} ${actionName} rahi hoon.`
  );
};

export const buildSystemToggleResponse = (target, action, romanticTone) => {
  const state = action === 'ON' ? 'on' : 'off';
  return withTone(
    romanticTone,
    `Theek hai jani, main ${target.toLowerCase()} ${state} kar rahi hoon.`,
    `Theek hai. Main ${target.toLowerCase()} ${state} kar rahi hoon.`
  );
};

export const buildClickResponse = (target, success, romanticTone) => {
  if (!success) {
    return withTone(
      romanticTone,
      `Jani, main "${target}" par click nahi kar pa rahi. Accessibility service on hai?`,
      `Main "${target}" par click nahi kar pa rahi. Baraye meherbani Accessibility service check karein.`
    );
  }
  return withTone(
    romanticTone,
    `Ji jani, maine "${target}" par click kar diya hai.`,
    `Theek hai, maine "${target}" par click kar diya hai.`
  );
};

export const buildTypeResponse = (text, success, romanticTone) => {
  if (!success) {
    return withTone(
      romanticTone,
      `Jani, main likh nahi pa rahi. Kya input field focused hai?`,
      `Main likh nahi pa rahi. Baraye meherbani check karein ke input field select hai ya nahi.`
    );
  }
  return withTone(
    romanticTone,
    `Theek hai jani, maine likh diya hai: "${text}"`,
    `Theek hai, maine likh diya hai: "${text}"`
  );
};
