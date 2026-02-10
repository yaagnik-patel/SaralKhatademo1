import { Linking, Alert } from 'react-native';

export const sendWhatsAppMessage = ({ name, phone, amount, language = 'english' }) => {
  const messages = {
    english: `💰 Hi ${name}, your pending amount is *₹${amount}*. Please settle soon. Thanks! 🙏

નમસ્તે ${name}, તમારી બાકી રકમ *₹${amount}* છે. કૃપા કરીને જલ્દી ચૂકવણી કરો. આભાર! 🙏 `
  };

  const message = messages[language] || messages.english;
  const phoneNumber = phone.startsWith('+91') ? phone : `+91${phone}`;
  const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'WhatsApp is not installed on your device');
  });
};

// Usage examples:
// sendWhatsAppMessage({ name: 'રાજેશ', phone: '9876543210', amount: 5000, language: 'gujarati' });
// sendWhatsAppMessage({ name: 'John', phone: '9876543210', amount: 5000, language: 'english' });