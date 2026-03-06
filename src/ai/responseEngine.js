const withTone = (romanticTone, romanticText, neutralText) => (
  romanticTone ? romanticText : neutralText
);

export const buildOpenAppResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Main ready hoon, jani. Aap pooch sakte hain kis kis ka message aya hai.',
    'Main ready hoon. Aap pooch sakte hain kis kis ka message aya hai.'
  )
);

export const buildPinRequiredResponse = (romanticTone) => (
  withTone(
    romanticTone,
    'Tell me PIN code first, jani. PIN 1598 verify hone ke baad main private info dikha sakti hoon.',
    'Tell me PIN code first. PIN 1598 verify hone ke baad main private info dikha sakti hoon.'
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
      `${message.sender} ko yeh jawab save kar diya gaya hai:\n"${draftText}"`,
      `${message.sender} ko yeh jawab save kar diya gaya hai:\n"${draftText}"`
    )
);

export const buildReplySentResponse = (message, draftText, romanticTone) => (
  withTone(
    romanticTone,
    `${message.sender} ko jawab bhej diya gaya, jani:\n"${draftText}"`,
    `${message.sender} ko jawab bhej diya gaya:\n"${draftText}"`
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
