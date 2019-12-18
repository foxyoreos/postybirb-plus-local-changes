import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as shortid from 'shortid';
import * as _ from 'lodash';
import { SubmissionTemplateRepository } from './submission-template.repository';
import { EventsGateway } from 'src/events/events.gateway';
import { SubmissionTemplateEvent } from './submission-template.events.enum';
import { CreateSubmissionTemplateDto } from './models/create-template.dto';
import { UpdateSubmissionTemplateDto } from './models/update-template.dto';
import { SubmissionTemplate } from './submission-template.interface';
import { DefaultOptions } from '../interfaces/submission-part.interface';

@Injectable()
export class SubmissionTemplateService {
  private readonly logger = new Logger(SubmissionTemplateService.name);

  constructor(
    private readonly repository: SubmissionTemplateRepository,
    private readonly eventEmitter: EventsGateway,
  ) {}

  async get(id: string) {
    const template = await this.repository.find(id);
    if (!template) {
      throw new NotFoundException(`Submission template ${id} does not exist.`);
    }

    return template;
  }

  getAll() {
    return this.repository.findAll();
  }

  async create(createDto: CreateSubmissionTemplateDto): Promise<SubmissionTemplate> {
    this.logger.log(createDto, 'Create Submission Template');
    const id = shortid.generate();

    const defaultPart: DefaultOptions = {
      title: '',
      rating: null,
      useThumbnail: true,
      description: {
        overwriteDefault: false,
        value: '',
      },
      tags: {
        extendDefault: true,
        value: [],
      },
    };

    const template: SubmissionTemplate = {
      id,
      alias: createDto.alias.trim(),
      type: createDto.type,
      parts: {
        default: {
          id: `${id}-default`,
          submissionId: id,
          website: 'default',
          accountId: 'default',
          data: defaultPart,
          isDefault: true,
        },
      },
      created: Date.now(),
    };

    const createdTemplate = await this.repository.create(template);
    this.eventEmitter.emit(SubmissionTemplateEvent.CREATED, createdTemplate);
    return createdTemplate;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(id, 'Delete Submission Template');
    await this.repository.remove(id);
    this.eventEmitter.emit(SubmissionTemplateEvent.REMOVED, id);
  }

  async update(updateDto: UpdateSubmissionTemplateDto): Promise<SubmissionTemplate> {
    this.logger.log(updateDto.id, 'Update Submission Template');
    const existing = await this.get(updateDto.id);
    existing.parts = _.groupBy(updateDto.parts, 'accountId') as any;
    await this.repository.update(updateDto.id, { parts: existing.parts });
    this.eventEmitter.emit(SubmissionTemplateEvent.UPDATED, existing);
    return existing;
  }

  async updateAlias(id: string, alias: string): Promise<SubmissionTemplate> {
    const existing = await this.repository.find(id);
    this.logger.verbose(`[${id}] ${existing.alias} -> ${alias}`, 'Rename Submission Template');
    existing.alias = alias.trim();
    await this.repository.update(id, { alias: existing.alias });
    this.eventEmitter.emit(SubmissionTemplateEvent.UPDATED, existing);
    return existing;
  }

  async removePartsForAccount(accountId: string): Promise<void> {
    this.logger.log(accountId, 'Delete Submission Template Parts For Account');
    const all = await this.getAll();
    all.forEach(async template => {
      if (template.parts[accountId]) {
        delete template.parts[accountId];
        await this.repository.update(template.id, { parts: template.parts });
        this.eventEmitter.emit(SubmissionTemplateEvent.UPDATED, template);
      }
    });
  }
}