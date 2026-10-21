import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ManagedUser, PageResponse } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { UserList } from './user-list';

const SELF_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';
const OTHER_ID = '7a1d2e3f-0000-4000-8000-000000000002';
const ME: ManagedUser = {
  id: 'u1',
  customerId: SELF_ID,
  email: 'me@bank.com',
  role: 'MANAGER',
  enabled: true,
  createdAt: '2025-01-01T10:00:00',
};
const TELLER: ManagedUser = {
  id: 'u2',
  customerId: OTHER_ID,
  email: 'teller@bank.com',
  role: 'CUSTOMER',
  enabled: false,
  createdAt: '2025-01-02T10:00:00',
};

function page(content: ManagedUser[], pageNumber = 0, totalPages = 1): PageResponse<ManagedUser> {
  return { content, page: pageNumber, size: 20, totalElements: content.length, totalPages };
}

function buttonWithText(el: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`No button with text "${text}"`);
  }
  return match;
}

describe('UserList', () => {
  let http: HttpTestingController;
  let permissions: string[];

  beforeEach(async () => {
    permissions = ['PERM_ADD', 'PERM_EDIT', 'PERM_DELETE'];
    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            customerId: signal<string | null>(SELF_ID),
            hasPermission: (permission: string) => permissions.includes(permission),
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(UserList);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function answerList(content: PageResponse<ManagedUser>, expectedPage = '0', expectedSize = '20') {
    const req = http.expectOne(
      (r) =>
        r.url === '/api/v1/auth/users' &&
        r.params.get('page') === expectedPage &&
        r.params.get('size') === expectedSize,
    );
    req.flush(content);
  }

  it('loads the first page with the default page size and renders the rows', () => {
    const { fixture, el } = render();
    answerList(page([ME, TELLER]));
    fixture.detectChanges();

    expect(el.textContent).toContain('me@bank.com');
    expect(el.textContent).toContain('teller@bank.com');
    expect(el.textContent).toContain('Disabled');
    expect(el.querySelector('.badge')?.textContent).toContain('You');
  });

  it('disables delete for the signed-in user only', () => {
    const { fixture, el } = render();
    answerList(page([ME, TELLER]));
    fixture.detectChanges();

    const deleteButtons = el.querySelectorAll<HTMLButtonElement>('button.link-danger');
    expect(deleteButtons[0].disabled).toBe(true);
    expect(deleteButtons[1].disabled).toBe(false);
  });

  it('hides actions the role has no permission for', () => {
    permissions = ['PERM_EDIT'];
    const { fixture, el } = render();
    answerList(page([ME, TELLER]));
    fixture.detectChanges();

    const links = Array.from(el.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(links).not.toContain('New user');
    expect(links).toContain('Edit');
    expect(el.querySelectorAll('button.link-danger').length).toBe(0);
  });

  it('reloads from the first page when the page size changes', () => {
    const { fixture, el } = render();
    answerList(page([ME]));
    fixture.detectChanges();

    const select = el.querySelector<HTMLSelectElement>('#page-size')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    answerList(page([ME]), '0', '50');
  });

  it('deletes a user after confirmation and reloads the list', () => {
    const { fixture, el } = render();
    answerList(page([ME, TELLER]));
    fixture.detectChanges();

    el.querySelectorAll<HTMLButtonElement>('button.link-danger')[1].click();
    fixture.detectChanges();
    buttonWithText(el, 'Confirm delete').click();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'DELETE', url: '/api/v1/auth/users/u2' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    answerList(page([ME]));
    fixture.detectChanges();

    expect(el.querySelector('[role=status]')?.textContent).toContain('Deleted teller@bank.com.');
    expect(el.querySelector('tbody')?.textContent).not.toContain('teller@bank.com');
  });

  it('steps back a page when its last row is deleted', () => {
    const { fixture, el } = render();
    answerList(page([ME], 0, 2));
    fixture.detectChanges();

    buttonWithText(el, 'Next').click();
    answerList(page([TELLER], 1, 2), '1');
    fixture.detectChanges();

    el.querySelectorAll<HTMLButtonElement>('button.link-danger')[0].click();
    fixture.detectChanges();
    buttonWithText(el, 'Confirm delete').click();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'DELETE', url: '/api/v1/auth/users/u2' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    answerList(page([ME], 0, 1), '0');
  });
});
