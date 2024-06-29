import Axios from 'axios';

export const AryionTagSearchProvider = (value: string) => {
  return Axios.get('https://aryion.com/g4/ajaxloader.php', {
    params: {
      q: value,
      dataset: 'tags',
      timestamp: new Date().valueOf(),
      limit: 10,
    }
  })
    .then(({ data }) => data.split('\n'))
    .catch(err => {
      console.error(err);
      return [];
    });
};
