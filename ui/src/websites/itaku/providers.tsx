import Axios from 'axios';

export const ItakuTagSearchProvider = (value: string) => {
  return Axios.get('https://itaku.ee/api/tags/', {
    params: {
      name: value,
      type: 'images',
      show_all_maturity: true
    }
  })
    .then(({ data }) => {
      let results = data.results;
      /* replace aliases */
      results = results.map(d => d.synonymous_to ? d.synonymous_to.name : d.name);
      return results;
    })
    .catch(err => {
      console.error(err);
      return [];
    });
};
