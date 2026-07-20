import { EventEmitter, ExtensionContext, QuickPickItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { SystemSettings } from '../models/configurationSettings';
import { EnvironmentStatusEntry } from '../utils/environmentStatusBarEntry';

type EnvironmentPickItem = QuickPickItem & { name: string };

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = {
        label: 'No Environment',
        name: Constants.NoEnvironmentSelectedName,
        description: 'You can still use variables defined in the $shared environment',
    };

    public static readonly sharedEnvironmentName: string = '$shared';

    private static readonly WORKSPACE_ENV_KEY = 'rest-client-next.selectedEnvironment';

    private static readonly _onDidChangeEnvironment = new EventEmitter<string>();

    public static readonly onDidChangeEnvironment =
        EnvironmentController._onDidChangeEnvironment.event;

    private static _instance: EnvironmentController | undefined;

    private readonly settings: SystemSettings = SystemSettings.Instance;
    private environmentStatusEntry: EnvironmentStatusEntry;
    private currentEnvironment: EnvironmentPickItem;

    private readonly context: ExtensionContext;

    private constructor(initEnvironment: EnvironmentPickItem, context: ExtensionContext) {
        this.currentEnvironment = initEnvironment;
        this.context = context;
        this.environmentStatusEntry = new EnvironmentStatusEntry(initEnvironment.label);
        EnvironmentController._instance = this;
    }

    public static get Instance(): EnvironmentController | undefined {
        return EnvironmentController._instance;
    }

    public async switchEnvironment() {
        const userEnvironments: EnvironmentPickItem[] = Object.keys(
            this.settings.environmentVariables
        )
            .filter(name => name !== EnvironmentController.sharedEnvironmentName)
            .map(name => ({
                name,
                label: name,
                description: name === this.currentEnvironment.name ? '$(check)' : undefined,
            }));

        const itemPickList: EnvironmentPickItem[] = [
            EnvironmentController.noEnvironmentPickItem,
            ...userEnvironments,
        ];
        const item = await window.showQuickPick(itemPickList, {
            placeHolder: 'Select REST Client Environment',
        });
        if (!item) {
            return;
        }

        this.currentEnvironment = item;

        EnvironmentController._onDidChangeEnvironment.fire(item.label);
        this.environmentStatusEntry.update(item.label);

        await this.context.workspaceState.update(EnvironmentController.WORKSPACE_ENV_KEY, item);
    }

    /**
     * Force synchronization of the memory and status bar with window's active workspace.
     */
    public async refreshEnvironment(): Promise<void> {
        const workspaceEnv = this.context.workspaceState.get<EnvironmentPickItem>(
            EnvironmentController.WORKSPACE_ENV_KEY
        );
        this.currentEnvironment = workspaceEnv || EnvironmentController.noEnvironmentPickItem;
        this.environmentStatusEntry.update(this.currentEnvironment.label);
    }

    public static async create(context: ExtensionContext): Promise<EnvironmentController> {
        const environment = await this.getCurrentEnvironment(context);
        return new EnvironmentController(environment, context);
    }

    public static async getCurrentEnvironment(
        context?: ExtensionContext
    ): Promise<EnvironmentPickItem> {
        if (EnvironmentController._instance) {
            const workspaceEnv =
                EnvironmentController._instance.context.workspaceState.get<EnvironmentPickItem>(
                    EnvironmentController.WORKSPACE_ENV_KEY
                );
            if (workspaceEnv) {
                return workspaceEnv;
            }
        } else if (context) {
            const workspaceEnv = context.workspaceState.get<EnvironmentPickItem>(
                EnvironmentController.WORKSPACE_ENV_KEY
            );
            if (workspaceEnv) {
                return workspaceEnv;
            }
        }

        return this.noEnvironmentPickItem;
    }

    public dispose() {
        this.environmentStatusEntry.dispose();
        EnvironmentController._instance = undefined;
    }
}
