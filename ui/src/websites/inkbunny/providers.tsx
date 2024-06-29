//https://inkbunny.net/api_search_autosuggest.php?ratingsmask=11111&underscorespaces=yes&keyword=test
import Axios from 'axios';

export const InkbunnyTagSearchProvider = (value: string) => {
  return Axios.get('https://inkbunny.net/api_search_autosuggest.php', {
    params: {
      keyword: value,
      ratingsmask: '11111',
      underscorespaces: 'yes'
    }
  })
    .then(({ data }) => {
      let results = data.results;
      results = results.map(d => d.value);
      return results;
    })
    .catch(err => {
      console.error(err);
      return [];
    });
};
