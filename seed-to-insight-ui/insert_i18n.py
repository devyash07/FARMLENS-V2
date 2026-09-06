#!/usr/bin/env python3
"""Insert new Phase 11 translation keys into I18nContext.tsx."""
import re

path = "src/contexts/I18nContext.tsx"
with open(path) as f:
    content = f.read()

new_keys_part1 = '''
  // --- Phase 11: Common actions & states ---
  "common.save": { en:"Save", hi:"सहेजें", bn:"সংরক্ষণ", te:"సేవ్", mr:"जतन", ta:"சேமி", gu:"સેવ", kn:"ಉಳಿಸಿ", pa:"ਸੰਭਾਲੋ", or:"ସଞ୍ଚୟ", ml:"സംരക്ഷിക്കുക" },
  "common.cancel": { en:"Cancel", hi:"रद्द करें", bn:"বাতিল", te:"రద్దు", mr:"रद्द", ta:"ரத்து", gu:"રદ", kn:"ರದ್ದು", pa:"ਰੱਦ", or:"ବାତିଲ", ml:"റദ്ദാക്കുക" },
  "common.delete": { en:"Delete", hi:"हटाएं", bn:"মুছুন", te:"తొలగించు", mr:"हटवा", ta:"நீக்கு", gu:"કાઢી નાખો", kn:"ಅಳಿಸಿ", pa:"ਹਟਾਓ", or:"ବିଲୋପ", ml:"ഇല്ലാതാക്കുക" },
  "common.edit": { en:"Edit", hi:"संपादित करें", bn:"সম্পাদনা", te:"సవరించు", mr:"संपादन", ta:"திருத்து", gu:"સંપાદન", kn:"ಸಂಪಾದನೆ", pa:"ਸੋਧ", or:"ସମ୍ପାଦନା", ml:"തിരുത്തുക" },
  "common.back": { en:"Back", hi:"वापस", bn:"পিছনে", te:"వెనుకకు", mr:"मागे", ta:"பின்", gu:"પાછા", kn:"ಹಿಂದೆ", pa:"ਪਿੱਛੇ", or:"ପଛକୁ", ml:"തിരികെ" },
  "common.next": { en:"Next", hi:"अगला", bn:"পরবর্তী", te:"తదుపరి", mr:"पुढे", ta:"அடுத்த", gu:"આગળ", kn:"ಮುಂದೆ", pa:"ਅੱਗੇ", or:"ପରବର୍ତ୍ତୀ", ml:"അടുത്തത്" },
  "common.search": { en:"Search", hi:"खोजें", bn:"অনুসন্ধান", te:"వెతకండి", mr:"शोध", ta:"தேடு", gu:"શોધો", kn:"ಹುಡುಕಿ", pa:"ਖੋਜ", or:"ଅନୁସନ୍ଧାନ", ml:"തിരയുക" },
  "common.loading": { en:"Loading...", hi:"लोड हो रहा है...", bn:"লোড হচ্ছে...", te:"లోడ్ అవుతోంది...", mr:"लोड होत आहे...", ta:"ஏற்றுகிறது...", gu:"લોડ થઈ રહ્યું છે...", kn:"ಲೋಡ್ ಆಗುತ್ತಿದೆ...", pa:"ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...", or:"ଲୋଡ ହେଉଛି...", ml:"ലോഡ് ചെയ്യുന്നു..." },
  "common.error": { en:"Error", hi:"त्रुटि", bn:"ত্রুটি", te:"లోపం", mr:"त्रुटी", ta:"பிழை", gu:"ભૂલ", kn:"ದೋಷ", pa:"ਗਲਤੀ", or:"ତ୍ରୁଟି", ml:"പിശക്" },
  "common.retry": { en:"Retry", hi:"पुनः प्रयास", bn:"আবার চেষ্টा", te:"మళ్లీ ప్రయత్నించండి", mr:"पुन्हा प्रयत्न", ta:"மீண்டும்", gu:"ફરી પ્રયાસ", kn:"ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", pa:"ਦੁਬਾਰਾ", or:"ପୁନର୍ବାର", ml:"വീണ്ടും ശ്രമിക്കുക" },
  "common.no_data": { en:"No data available", hi:"कोई डेटा उपलब्ध नहीं", bn:"কোনো তথ্য পাওয়া যাচ্ছে না", te:"డేటా అందుబాటులో లేదు", mr:"डेटा उपलब्ध नाही", ta:"தரவு இல்லை", gu:"કોઈ ડેટા ઉપલબ્ધ નથી", kn:"ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ", pa:"ਕੋਈ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ", or:"କୌଣସି ଡାଟା ଉପଲବ୍ଧ ନୁହେଁ", ml:"ഡാറ്റ ലഭ്യമല്ല" },
  "common.something_went_wrong": { en:"Something went wrong", hi:"कुछ गलत हो गया", bn:"কিছু ভুল হয়েছে", te:"ఏదో తప్పు జరిగింది", mr:"काही चूक झाली", ta:"ஏதோ தவறு நடந்தது", gu:"કંઈક ખોટું થયું", kn:"ಏನೋ ತಪ್ಪಾಗಿದೆ", pa:"ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ", or:"କିଛି ଭୁଲ ହୋଇଛି", ml:"എന്തോ കുഴപ്പം സംഭവിച്ചു" },
  "common.close": { en:"Close", hi:"बंद करें", bn:"বন্ধ", te:"మూసివేయి", mr:"बंद", ta:"மூடு", gu:"બંદ", kn:"ಮುಚ್ಚಿ", pa:"ਬੰਦ", or:"ବନ୍ଧ", ml:"അടയ്ക്കുക" },
  "common.confirm": { en:"Confirm", hi:"पुष्टि करें", bn:"নিশ্চিত", te:"నిర్ధారించండి", mr:"खात्री", ta:"உறுதிப்படுத்து", gu:"પુષ્ટિ", kn:"ಖಚಿತಪಡಿಸಿ", pa:"ਪੁਸ਼ਟੀ", or:"ନିଶ୍ଚିତ", ml:"സ്ഥിരീകരിക്കുക" },
  "common.create": { en:"Create", hi:"बनाएं", bn:"তৈরি", te:"సృష్టించండి", mr:"तयार", ta:"உருவாக்கு", gu:"બનાવો", kn:"ರಚಿಸಿ", pa:"ਬਣਾਓ", or:"ସୃଷ୍ଟି", ml:"സൃഷ്ടിക്കുക" },
  "common.add": { en:"Add", hi:"जोड़ें", bn:"যোগ", te:"జోడించండి", mr:"जोडा", ta:"சேர்", gu:"ઉમેરો", kn:"ಸೇರಿಸಿ", pa:"ਜੋੜੋ", or:"ଯୋଡ଼ନ୍ତୁ", ml:"ചേർക്കുക" },
  "common.view": { en:"View", hi:"देखें", bn:"দেখুন", te:"చూడండి", mr:"पहा", ta:"காண்க", gu:"જુઓ", kn:"ನೋಡಿ", pa:"ਵੇਖੋ", or:"ଦେଖନ୍ତୁ", ml:"കാണുക" },
  "common.name": { en:"Name", hi:"नाम", bn:"নाम", te:"పేరు", mr:"नाव", ta:"பெயர்", gu:"નામ", kn:"ಹೆಸರು", pa:"ਨਾਮ", or:"ନାମ", ml:"പേര്" },
'''

marker = '\n};'
idx = content.rfind(marker)
if idx == -1:
    raise RuntimeError("Could not find translations object end")

content = content[:idx] + ',\n' + new_keys_part1 + content[idx:]

with open(path, 'w') as f:
    f.write(content)
print(f"Inserted part 1: {new_keys_part1.count('\"common.')} keys")
