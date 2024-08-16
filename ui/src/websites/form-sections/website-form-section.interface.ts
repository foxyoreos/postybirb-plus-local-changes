import { Submission } from 'postybirb-commons';
import { DefaultOptions } from 'postybirb-commons';
import { SubmissionSectionProps } from '../../views/submissions/submission-forms/interfaces/submission-section.interface';
import { TagOptions } from '../../views/submissions/submission-forms/form-components/TagInput';
import { SubmissionRating } from 'postybirb-commons';

export interface WebsiteSectionProps<T extends Submission, K extends DefaultOptions>
  extends SubmissionSectionProps<T, K> {
  hideTitle?: boolean;
  hideThumbnailOptions?: boolean;
  hideAutoscaleOptions?: boolean;
  website?: string;
  descriptionOptions?: {
    show: boolean;
    options?: {
      lengthParser?: (text: string) => number;
      anchorLength?: number;
    };
  };
  tagOptions?: {
    show: boolean;
    options?: TagOptions;
    searchProvider?: (value: string) => Promise<string[]>;
  };
  ratingOptions?: {
    show: boolean;
    ratings?: {
      value: SubmissionRating | string;
      name: string;
    }[];
  };
}
