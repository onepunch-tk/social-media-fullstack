import { Injectable } from '@nestjs/common';
import { ICommand, IEvent, ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { AccountRegisteredEvent } from '#auth/domain/events/account-registered.event';
import { EnsureProfileCommand } from '../use-cases/ensure-profile/ensure-profile.command';

@Injectable()
export class AccountRegisteredSaga {
  @Saga()
  accountRegistered(events$: Observable<IEvent>): Observable<ICommand> {
    return events$.pipe(
      ofType(AccountRegisteredEvent),
      map((e) => new EnsureProfileCommand(e.accountId)),
    );
  }
}
