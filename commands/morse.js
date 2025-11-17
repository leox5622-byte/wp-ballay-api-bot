module.exports = {
  config: {
    name: "morse",
    version: "1.2",
    author: "RL",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Encode and decode Morse code."
    },
    description: {
      en: "This command encodes and decodes messages in Morse code."
    },
    category: "tools",
    guide: {
      en: "Use !morse <encode/decode> <message>"
    }
  },

  // Morse code map for letters, numbers, and some punctuation
  morseCode: {
    'A': '.-',    'B': '-...',  'C': '-.-.', 'D': '-..',   'E': '.',
    'F': '..-.',  'G': '--.',   'H': '....', 'I': '..',    'J': '.---',
    'K': '-.-',   'L': '.-..',  'M': '--',   'N': '-.',    'O': '---',
    'P': '.--.',  'Q': '--.-',  'R': '.-.',  'S': '...',   'T': '-',
    'U': '..-',   'V': '...-',  'W': '.--',  'X': '-..-',  'Y': '-.--',
    'Z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
    '!': '-.-.--','@': '.--.-.','&': '.-...', ':': '---...', ';': '-.-.-.',
    ',': '--..--','.': '.-.-.-','?': '..--..','-': '-....-','/': '-..-.',
    ' ': '/'
  },

  // Reverse map cached for decoding
  reversedMorse: null,

  // Initialize reversed map once
  getReversedMorse() {
    if (!this.reversedMorse) {
      this.reversedMorse = Object.fromEntries(
        Object.entries(this.morseCode).map(([k, v]) => [v, k])
      );
    }
    return this.reversedMorse;
  },

  // Encode plain text to Morse code
  encode(message) {
    return message
      .toUpperCase()
      .split('')
      .map(char => this.morseCode[char] || '')
      .filter(Boolean)
      .join(' ');
  },

  // Decode Morse code to plain text
  decode(morseMessage) {
    const reversed = this.getReversedMorse();
    // Split on space, treat '/' as space character
    return morseMessage
      .trim()
      .split(' ')
      .map(code => code === '/' ? ' ' : (reversed[code] || ''))
      .join('');
  },

  // Entry point for the command
  onStart: async function({ api, args, message }) {
    try {
      if (args.length < 2) {
        return message.reply("Usage: !morse <encode|decode> <message>");
      }

      const action = args[0].toLowerCase();
      const input = args.slice(1).join(' ').trim();

      if (!input) {
        return message.reply("Please provide a message to encode or decode.");
      }

      if (action === 'encode') {
        const encoded = this.encode(input);
        return message.reply(`Encoded: ${encoded}`);
      }

      if (action === 'decode') {
        const decoded = this.decode(input);
        return message.reply(`Decoded: ${decoded}`);
      }

      message.reply("Invalid action. Use 'encode' or 'decode'.");
    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      await message.reply('❌ An error occurred while executing this command.');
    }
  }
};
